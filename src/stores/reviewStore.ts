import { create } from 'zustand'
import type { PR } from './prStore'

export interface FeedbackPoint {
  id: string
  severity: 'high' | 'medium' | 'low' | 'info'
  file: string
  lineStart: number
  lineEnd: number
  title: string
  description: string
  suggestion: string
  posted: boolean
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ReviewState {
  loading: boolean
  reviewPhase: 'fetching-diff' | 'reviewing' | null
  rawOutput: string
  summary: string | null
  feedback: FeedbackPoint[]
  diff: string | null
  conversation: ConversationMessage[]
  chatLoading: boolean
  chatStreamingContent: string
  reviewedAt: number | null
  error: string | null
  startReview: (pr: PR) => Promise<void>
  sendChatMessage: (message: string, pr: PR) => void
  loadStoredReview: (pr: PR) => void
  cancel: () => void
  reset: () => void
}

// ── localStorage helpers ──────────────────────────────────────────────────────

const LS_KEY = 'karen:reviews'

interface StoredReview {
  summary: string
  feedback: FeedbackPoint[]
  diff: string
  conversation: ConversationMessage[]
  rawOutput: string
  reviewedAt: number
}

type ReviewMap = Record<string, StoredReview>

function prKey(pr: PR): string {
  return `${pr.repoFullName}#${pr.number}`
}

function readStorage(): ReviewMap {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') as ReviewMap
  } catch {
    return {}
  }
}

function writeStorage(map: ReviewMap): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map))
  } catch {
    // Silently ignore quota errors
  }
}

function saveReview(pr: PR, data: StoredReview): void {
  writeStorage({ ...readStorage(), [prKey(pr)]: data })
}

// ── Parsing ──────────────────────────────────────────────────────────────────

interface ParsedReview {
  summary: string
  feedback: Omit<FeedbackPoint, 'id' | 'posted'>[]
}

function isValidReview(obj: unknown): obj is ParsedReview {
  if (typeof obj !== 'object' || obj === null) return false
  const r = obj as Record<string, unknown>
  return typeof r.summary === 'string' && Array.isArray(r.feedback)
}

function parseReviewOutput(raw: string): ParsedReview | null {
  let content = raw.trim()

  // 1. Unwrap claude CLI JSON envelope: {"type":"result","result":"...","session_id":...}
  try {
    const envelope = JSON.parse(content)
    if (typeof envelope.result === 'string') {
      content = envelope.result
    }
  } catch {
    // not an envelope — use raw
  }

  // 2. Direct JSON parse
  try {
    const parsed = JSON.parse(content)
    if (isValidReview(parsed)) return parsed
  } catch { /* fall through */ }

  // 3. Extract from ```json ... ``` block
  const block = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (block) {
    try {
      const parsed = JSON.parse(block[1].trim())
      if (isValidReview(parsed)) return parsed
    } catch { /* fall through */ }
  }

  // 4. Last resort: find outermost { ... } containing "summary" + "feedback"
  const start = content.indexOf('{')
  const end = content.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(content.slice(start, end + 1))
      if (isValidReview(parsed)) return parsed
    } catch { /* give up */ }
  }

  return null
}

// Unwrap claude CLI envelope for plain-text chat responses
function unwrapClaudeOutput(raw: string): string {
  const content = raw.trim()
  try {
    const envelope = JSON.parse(content)
    if (typeof envelope.result === 'string') return envelope.result
  } catch { /* not an envelope */ }
  return content
}

// ── Prompts ───────────────────────────────────────────────────────────────────

function buildPrompt(diff: string, pr: PR): string {
  return `You are reviewing a GitHub pull request.

Repository: ${pr.repoFullName}
PR #${pr.number}: ${pr.title}
Author: ${pr.author}
Branch: ${pr.headRef} → ${pr.baseRef}

Here is the diff:

<diff>
${diff}
</diff>

Analyze this PR and return your review as JSON only — no explanation, no markdown, just the raw JSON object:
{
  "summary": "brief overall assessment in 1-2 sentences",
  "feedback": [
    {
      "severity": "high|medium|low|info",
      "file": "path/to/file.ts",
      "lineStart": 1,
      "lineEnd": 5,
      "title": "short title (max 10 words)",
      "description": "detailed explanation of the issue",
      "suggestion": "what to do instead"
    }
  ]
}

Rules:
- severity "high" = bugs, security issues, data loss risk
- severity "medium" = logic errors, bad patterns, missing error handling
- severity "low" = style, naming, minor improvements
- severity "info" = observations, questions, praise
- Use exact file paths and line numbers from the diff
- Return only valid JSON, nothing else`
}

function buildChatPrompt(
  message: string,
  context: {
    diff: string | null
    summary: string | null
    feedback: FeedbackPoint[]
    conversation: ConversationMessage[]
    pr: PR
  },
): string {
  const { diff, summary, feedback, conversation, pr } = context
  const parts: string[] = []

  parts.push(
    `You are helping a developer understand and review a GitHub pull request.\n` +
    `Repository: ${pr.repoFullName}\n` +
    `PR #${pr.number}: ${pr.title}\n` +
    `Author: ${pr.author} · ${pr.headRef} → ${pr.baseRef}`,
  )

  if (diff) {
    parts.push(`\nHere is the diff:\n\n<diff>\n${diff}\n</diff>`)
  }

  if (summary) {
    parts.push(`\nReview summary: ${summary}`)
  }

  if (feedback.length > 0) {
    const fp = feedback
      .map(f => `• [${f.severity.toUpperCase()}] ${f.file} L${f.lineStart}–${f.lineEnd}: ${f.title}`)
      .join('\n')
    parts.push(`\nReview findings:\n${fp}`)
  }

  if (conversation.length > 0) {
    const history = conversation
      .map(m => `${m.role === 'user' ? 'Developer' : 'Claude'}: ${m.content}`)
      .join('\n\n')
    parts.push(`\nConversation so far:\n${history}`)
  }

  parts.push(`\nDeveloper's question: ${message}`)
  parts.push(`\nAnswer concisely and helpfully. Use markdown for code snippets. Do not repeat the diff.`)

  return parts.join('\n')
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useReviewStore = create<ReviewState>((set, get) => ({
  loading: false,
  reviewPhase: null,
  rawOutput: '',
  summary: null,
  feedback: [],
  diff: null,
  conversation: [],
  chatLoading: false,
  chatStreamingContent: '',
  reviewedAt: null,
  error: null,

  startReview: async (pr) => {
    set({
      loading: true,
      reviewPhase: 'fetching-diff',
      rawOutput: '',
      summary: null,
      feedback: [],
      diff: null,
      conversation: [],
      chatLoading: false,
      chatStreamingContent: '',
      reviewedAt: null,
      error: null,
    })

    // 1. Fetch diff
    let diff: string
    try {
      const result = await window.api.exec('gh', [
        'pr', 'diff', String(pr.number),
        '--repo', pr.repoFullName,
      ])
      diff = result.stdout
    } catch {
      set({ loading: false, reviewPhase: null, error: 'Failed to fetch PR diff. Make sure gh is authenticated.' })
      return
    }

    if (!diff.trim()) {
      set({ loading: false, reviewPhase: null, error: 'No diff found — the PR may have no file changes.' })
      return
    }

    set({ reviewPhase: 'reviewing', diff })

    // 2. Clean stale listeners
    window.api.removeAllListeners('stream-data')
    window.api.removeAllListeners('stream-end')
    window.api.removeAllListeners('stream-error')

    let accumulated = ''

    window.api.onStreamData((chunk) => {
      accumulated += chunk
      set((s) => ({ rawOutput: s.rawOutput + chunk }))
    })

    window.api.onStreamEnd(() => {
      window.api.removeAllListeners('stream-data')
      window.api.removeAllListeners('stream-end')
      window.api.removeAllListeners('stream-error')

      const parsed = parseReviewOutput(accumulated)
      if (parsed) {
        const now = Date.now()
        const mappedFeedback = parsed.feedback.map((fp, i) => ({
          ...fp,
          id: `fp_${i}`,
          posted: false,
        }))
        set({
          loading: false,
          reviewPhase: null,
          summary: parsed.summary,
          feedback: mappedFeedback,
          reviewedAt: now,
        })
        // Persist to localStorage
        saveReview(pr, {
          summary: parsed.summary,
          feedback: mappedFeedback,
          diff,
          conversation: [],
          rawOutput: accumulated,
          reviewedAt: now,
        })
      } else {
        set({ loading: false, reviewPhase: null, error: 'Could not parse Claude\'s response as JSON. See terminal output above.' })
      }
    })

    window.api.onStreamError((err) => {
      window.api.removeAllListeners('stream-data')
      window.api.removeAllListeners('stream-end')
      window.api.removeAllListeners('stream-error')
      set({ loading: false, reviewPhase: null, error: `Stream error: ${err}` })
    })

    // 3. Spawn claude
    const prompt = buildPrompt(diff, pr)
    window.api.execStream('claude', ['-p', prompt])
  },

  sendChatMessage: (message, pr) => {
    const { diff, summary, feedback, conversation } = get()

    set((s) => ({
      conversation: [...s.conversation, { role: 'user', content: message }],
      chatLoading: true,
      chatStreamingContent: '',
    }))

    window.api.removeAllListeners('stream-data')
    window.api.removeAllListeners('stream-end')
    window.api.removeAllListeners('stream-error')

    let accumulated = ''

    window.api.onStreamData((chunk) => {
      accumulated += chunk
      set({ chatStreamingContent: accumulated })
    })

    window.api.onStreamEnd(() => {
      window.api.removeAllListeners('stream-data')
      window.api.removeAllListeners('stream-end')
      window.api.removeAllListeners('stream-error')

      const content = unwrapClaudeOutput(accumulated) || 'No response received.'

      set((s) => {
        const updated = [...s.conversation, { role: 'assistant' as const, content }]
        // Persist updated conversation
        const stored = readStorage()[prKey(pr)]
        if (stored) saveReview(pr, { ...stored, conversation: updated })
        return { conversation: updated, chatLoading: false, chatStreamingContent: '' }
      })
    })

    window.api.onStreamError((err) => {
      window.api.removeAllListeners('stream-data')
      window.api.removeAllListeners('stream-end')
      window.api.removeAllListeners('stream-error')
      set((s) => ({
        conversation: [...s.conversation, { role: 'assistant', content: `Sorry, an error occurred: ${err}` }],
        chatLoading: false,
        chatStreamingContent: '',
      }))
    })

    const prompt = buildChatPrompt(message, { diff, summary, feedback, conversation, pr })
    window.api.execStream('claude', ['-p', prompt])
  },

  loadStoredReview: (pr) => {
    const stored = readStorage()[prKey(pr)]
    if (!stored) return
    set({
      summary: stored.summary,
      feedback: stored.feedback,
      diff: stored.diff,
      conversation: stored.conversation,
      rawOutput: stored.rawOutput,
      reviewedAt: stored.reviewedAt,
      loading: false,
      reviewPhase: null,
      chatLoading: false,
      chatStreamingContent: '',
      error: null,
    })
  },

  cancel: () => {
    window.api.cancelStream()
    window.api.removeAllListeners('stream-data')
    window.api.removeAllListeners('stream-end')
    window.api.removeAllListeners('stream-error')
    set({ loading: false, reviewPhase: null, chatLoading: false, chatStreamingContent: '' })
  },

  reset: () => {
    set({
      loading: false,
      reviewPhase: null,
      rawOutput: '',
      summary: null,
      feedback: [],
      diff: null,
      conversation: [],
      chatLoading: false,
      chatStreamingContent: '',
      reviewedAt: null,
      error: null,
    })
  },
}))
