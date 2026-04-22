import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PRCard from '../../../src/components/PRList/PRCard'
import type { PR } from '../../../src/stores/prStore'

const makePR = (overrides: Partial<PR> = {}): PR => ({
  number: 42,
  title: 'Fix critical auth bug',
  state: 'open',
  author: 'alice',
  repo: 'myrepo',
  repoFullName: 'org/myrepo',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
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
  ...overrides,
})

describe('PRCard', () => {
  it('renders title, repo and PR number', () => {
    render(<PRCard pr={makePR()} selected={false} onClick={vi.fn()} />)
    expect(screen.getByText('Fix critical auth bug')).toBeInTheDocument()
    expect(screen.getByText('myrepo')).toBeInTheDocument()
    expect(screen.getByText('#42')).toBeInTheDocument()
  })

  it('renders the author', () => {
    render(<PRCard pr={makePR()} selected={false} onClick={vi.fn()} />)
    expect(screen.getByText('alice')).toBeInTheDocument()
  })

  it('shows "Open" for non-draft PRs', () => {
    render(<PRCard pr={makePR({ isDraft: false })} selected={false} onClick={vi.fn()} />)
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('shows "Draft" for draft PRs', () => {
    render(<PRCard pr={makePR({ isDraft: true })} selected={false} onClick={vi.fn()} />)
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('shows additions and deletions when > 0', () => {
    render(<PRCard pr={makePR({ additions: 120, deletions: 30 })} selected={false} onClick={vi.fn()} />)
    expect(screen.getByText('+120')).toBeInTheDocument()
    expect(screen.getByText('-30')).toBeInTheDocument()
  })

  it('hides additions/deletions when both are 0', () => {
    render(<PRCard pr={makePR({ additions: 0, deletions: 0 })} selected={false} onClick={vi.fn()} />)
    expect(screen.queryByText(/^\+\d/)).not.toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<PRCard pr={makePR()} selected={false} onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
