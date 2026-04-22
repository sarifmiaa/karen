import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PRList from '../../../src/components/PRList/PRList'
import type { PR } from '../../../src/stores/prStore'

vi.mock('../../../src/stores/prStore', () => ({
  usePRStore: vi.fn(),
}))
vi.mock('../../../src/stores/orgStore', () => ({
  useOrgStore: vi.fn(),
}))

import { usePRStore } from '../../../src/stores/prStore'
import { useOrgStore } from '../../../src/stores/orgStore'

const mockPR: PR = {
  number: 7,
  title: 'Add dark mode support',
  state: 'open',
  author: 'bob',
  repo: 'ui-kit',
  repoFullName: 'org/ui-kit',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isDraft: false,
  additions: 50,
  deletions: 10,
  headRef: 'feat/dark-mode',
  baseRef: 'main',
  labels: [],
  reviewDecision: '',
  url: 'https://github.com/org/ui-kit/pull/7',
  assignees: ['alice'],
  requestedReviewers: ['alice'],
}

const baseOrgStore = { selectedOrg: null, currentUser: 'alice', orgs: [] }

const basePRStore = {
  prs: [],
  loading: false,
  filter: 'all' as const,
  setFilter: vi.fn(),
  fetchPRs: vi.fn(),
  selectedPR: null,
  setSelectedPR: vi.fn(),
  updatePR: vi.fn(),
}

describe('PRList', () => {
  beforeEach(() => {
    vi.mocked(useOrgStore).mockReturnValue(baseOrgStore)
    vi.mocked(usePRStore).mockReturnValue(basePRStore)
  })

  it('shows loading spinner while fetching', () => {
    vi.mocked(usePRStore).mockReturnValue({ ...basePRStore, loading: true })
    render(<PRList />)
    expect(screen.getByText('Fetching PRs...')).toBeInTheDocument()
  })

  it('shows empty state when there are no PRs', () => {
    render(<PRList />)
    expect(screen.getByText('No open pull requests')).toBeInTheDocument()
  })

  it('renders PR cards when PRs are present', () => {
    vi.mocked(usePRStore).mockReturnValue({ ...basePRStore, prs: [mockPR] })
    render(<PRList />)
    expect(screen.getByText('Add dark mode support')).toBeInTheDocument()
  })

  it('shows the PR count', () => {
    vi.mocked(usePRStore).mockReturnValue({ ...basePRStore, prs: [mockPR] })
    render(<PRList />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders all three filter buttons', () => {
    render(<PRList />)
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Assigned')).toBeInTheDocument()
    expect(screen.getByText('Reviewer')).toBeInTheDocument()
  })

  it('calls setFilter when a filter button is clicked', async () => {
    const setFilter = vi.fn()
    vi.mocked(usePRStore).mockReturnValue({ ...basePRStore, setFilter })
    render(<PRList />)
    await userEvent.click(screen.getByText('Assigned'))
    expect(setFilter).toHaveBeenCalledWith('assigned')
  })

  it('highlights the active filter', () => {
    vi.mocked(usePRStore).mockReturnValue({ ...basePRStore, filter: 'reviewer' as const })
    render(<PRList />)
    expect(screen.getByText('Reviewer')).toHaveClass('bg-gray-200')
  })

  it('calls setSelectedPR when a PR card is clicked', async () => {
    const setSelectedPR = vi.fn()
    vi.mocked(usePRStore).mockReturnValue({ ...basePRStore, prs: [mockPR], setSelectedPR })
    render(<PRList />)
    await userEvent.click(screen.getByText('Add dark mode support'))
    expect(setSelectedPR).toHaveBeenCalledWith(mockPR)
  })

  it('filters to assigned PRs when filter is "assigned"', () => {
    const unassignedPR = { ...mockPR, number: 8, title: 'Other PR', assignees: [] }
    vi.mocked(usePRStore).mockReturnValue({
      ...basePRStore,
      prs: [mockPR, unassignedPR],
      filter: 'assigned' as const,
    })
    render(<PRList />)
    expect(screen.getByText('Add dark mode support')).toBeInTheDocument()
    expect(screen.queryByText('Other PR')).not.toBeInTheDocument()
  })
})
