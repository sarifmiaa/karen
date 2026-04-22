import type { PR } from '../stores/prStore'

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

export interface ParsedReview {
  summary: string
  feedback: Omit<FeedbackPoint, 'id' | 'posted'>[]
}

function isValidReview(obj: unknown): obj is ParsedReview {
  if (typeof obj !== 'object' || obj === null) return false
  const r = obj as Record<string, unknown>
  return typeof r.summary === 'string' && Array.isArray(r.feedback)
}

export function parseReviewOutput(raw: string): ParsedReview | null {
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

export function unwrapClaudeOutput(raw: string): string {
  const content = raw.trim()
  try {
    const envelope = JSON.parse(content)
    if (typeof envelope.result === 'string') return envelope.result
  } catch { /* not an envelope */ }
  return content
}

export function buildPrompt(diff: string, pr: PR): string {
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

export function buildChatPrompt(
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
