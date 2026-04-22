import { create } from 'zustand'
import type { PR } from './prStore'
import {
  parseReviewOutput,
  unwrapClaudeOutput,
  buildPrompt,
  buildChatPrompt,
} from '../lib/review'
export type { FeedbackPoint, ConversationMessage } from '../lib/review'
import type { FeedbackPoint, ConversationMessage } from '../lib/review'

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
