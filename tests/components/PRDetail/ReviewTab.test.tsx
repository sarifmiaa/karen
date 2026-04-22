import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReviewTab from '../../../src/components/PRDetail/ReviewTab'
import type { PR } from '../../../src/stores/prStore'

vi.mock('../../../src/stores/reviewStore', () => ({
  useReviewStore: vi.fn(),
}))

import { useReviewStore } from '../../../src/stores/reviewStore'

const mockPR: PR = {
  number: 42,
  title: 'Fix auth bug',
  state: 'open',
  author: 'alice',
  repo: 'myrepo',
  repoFullName: 'org/myrepo',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  isDraft: false,
  additions: 0,
  deletions: 0,
  headRef: 'fix/auth',
  baseRef: 'main',
  labels: [],
  reviewDecision: '',
  url: 'https://github.com/org/myrepo/pull/42',
  assignees: [],
  requestedReviewers: [],
}

const idleStore = {
  loading: false,
  reviewPhase: null,
  rawOutput: '',
  summary: null,
  feedback: [],
  diff: null,
  error: null,
  conversation: [],
  chatLoading: false,
  chatStreamingContent: '',
  reviewedAt: null,
  startReview: vi.fn(),
  cancel: vi.fn(),
  reset: vi.fn(),
  sendChatMessage: vi.fn(),
  loadStoredReview: vi.fn(),
}

describe('ReviewTab', () => {
  beforeEach(() => {
    vi.mocked(useReviewStore).mockReturnValue(idleStore)
  })

  describe('idle state', () => {
    it('shows "Review this PR" button', () => {
      render(<ReviewTab pr={mockPR} />)
      expect(screen.getByText('Review this PR')).toBeInTheDocument()
    })

    it('calls startReview with the PR when button is clicked', async () => {
      const startReview = vi.fn()
      vi.mocked(useReviewStore).mockReturnValue({ ...idleStore, startReview })
      render(<ReviewTab pr={mockPR} />)
      await userEvent.click(screen.getByText('Review this PR'))
      expect(startReview).toHaveBeenCalledWith(mockPR)
    })
  })

  describe('loading state', () => {
    it('shows the terminal with Cancel button', () => {
      vi.mocked(useReviewStore).mockReturnValue({
        ...idleStore, loading: true, reviewPhase: 'reviewing',
      })
      render(<ReviewTab pr={mockPR} />)
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('shows "Fetching diff…" phase label', () => {
      vi.mocked(useReviewStore).mockReturnValue({
        ...idleStore, loading: true, reviewPhase: 'fetching-diff',
      })
      render(<ReviewTab pr={mockPR} />)
      expect(screen.getByText('Fetching diff…')).toBeInTheDocument()
    })

    it('shows "Reviewing…" phase label', () => {
      vi.mocked(useReviewStore).mockReturnValue({
        ...idleStore, loading: true, reviewPhase: 'reviewing',
      })
      render(<ReviewTab pr={mockPR} />)
      expect(screen.getByText('Reviewing…')).toBeInTheDocument()
    })

    it('calls cancel when Cancel is clicked', async () => {
      const cancel = vi.fn()
      vi.mocked(useReviewStore).mockReturnValue({
        ...idleStore, loading: true, reviewPhase: 'reviewing', cancel,
      })
      render(<ReviewTab pr={mockPR} />)
      cancel.mockClear() // clear the mount-time call from useEffect
      await userEvent.click(screen.getByText('Cancel'))
      expect(cancel).toHaveBeenCalledOnce()
    })
  })

  describe('error state', () => {
    it('shows error message', () => {
      vi.mocked(useReviewStore).mockReturnValue({
        ...idleStore, error: 'Failed to fetch diff.',
      })
      render(<ReviewTab pr={mockPR} />)
      expect(screen.getByText('Review failed')).toBeInTheDocument()
      expect(screen.getByText('Failed to fetch diff.')).toBeInTheDocument()
    })

    it('shows Try again button that calls startReview', async () => {
      const startReview = vi.fn()
      vi.mocked(useReviewStore).mockReturnValue({
        ...idleStore, error: 'Something went wrong', startReview,
      })
      render(<ReviewTab pr={mockPR} />)
      await userEvent.click(screen.getByText('Try again'))
      expect(startReview).toHaveBeenCalledWith(mockPR)
    })
  })

  describe('done state', () => {
    const doneStore = {
      ...idleStore,
      summary: 'Overall the PR looks good.',
      diff: '',
      feedback: [],
      reviewedAt: Date.now(),
    }

    it('renders the review summary', () => {
      vi.mocked(useReviewStore).mockReturnValue(doneStore)
      render(<ReviewTab pr={mockPR} />)
      expect(screen.getByText('Overall the PR looks good.')).toBeInTheDocument()
    })

    it('shows the chat input', () => {
      vi.mocked(useReviewStore).mockReturnValue(doneStore)
      render(<ReviewTab pr={mockPR} />)
      expect(screen.getByPlaceholderText(/Ask a follow-up/)).toBeInTheDocument()
    })

    it('shows all quick action buttons', () => {
      vi.mocked(useReviewStore).mockReturnValue(doneStore)
      render(<ReviewTab pr={mockPR} />)
      expect(screen.getByText('Explain this PR')).toBeInTheDocument()
      expect(screen.getByText('Security concerns?')).toBeInTheDocument()
      expect(screen.getByText('Suggest tests')).toBeInTheDocument()
    })

    it('sends a chat message on Ctrl+Enter', async () => {
      const sendChatMessage = vi.fn()
      vi.mocked(useReviewStore).mockReturnValue({ ...doneStore, sendChatMessage })
      render(<ReviewTab pr={mockPR} />)
      const textarea = screen.getByPlaceholderText(/Ask a follow-up/)
      await userEvent.type(textarea, 'Is this secure?')
      await userEvent.keyboard('{Control>}{Enter}{/Control}')
      expect(sendChatMessage).toHaveBeenCalledWith('Is this secure?', mockPR)
    })

    it('sends a chat message via quick action button', async () => {
      const sendChatMessage = vi.fn()
      vi.mocked(useReviewStore).mockReturnValue({ ...doneStore, sendChatMessage })
      render(<ReviewTab pr={mockPR} />)
      await userEvent.click(screen.getByText('Explain this PR'))
      expect(sendChatMessage).toHaveBeenCalledWith('Explain this PR', mockPR)
    })

    it('renders conversation messages', () => {
      vi.mocked(useReviewStore).mockReturnValue({
        ...doneStore,
        conversation: [
          { role: 'user', content: 'Is this safe?' },
          { role: 'assistant', content: 'Yes, it is safe.' },
        ],
      })
      render(<ReviewTab pr={mockPR} />)
      expect(screen.getByText('Is this safe?')).toBeInTheDocument()
      expect(screen.getByText('Yes, it is safe.')).toBeInTheDocument()
    })
  })
})
