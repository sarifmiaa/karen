import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import InlineFeedbackCard from '../../../../src/components/PRDetail/DiffView/InlineFeedbackCard'
import type { FeedbackPoint } from '../../../../src/lib/review'

const makePoint = (overrides: Partial<FeedbackPoint> = {}): FeedbackPoint => ({
  id: 'fp_1',
  severity: 'medium',
  file: 'src/auth.ts',
  lineStart: 10,
  lineEnd: 15,
  title: 'Missing null check',
  description: 'The value could be null here.',
  suggestion: 'Add a null check before accessing the property.',
  posted: false,
  ...overrides,
})

describe('InlineFeedbackCard', () => {
  it('renders title and description', () => {
    render(<InlineFeedbackCard point={makePoint()} />)
    expect(screen.getByText('Missing null check')).toBeInTheDocument()
    expect(screen.getByText('The value could be null here.')).toBeInTheDocument()
  })

  it('renders the severity badge', () => {
    render(<InlineFeedbackCard point={makePoint({ severity: 'high' })} />)
    expect(screen.getByText('high')).toBeInTheDocument()
  })

  it('renders all severity levels without crashing', () => {
    const severities: FeedbackPoint['severity'][] = ['high', 'medium', 'low', 'info']
    for (const severity of severities) {
      const { unmount } = render(<InlineFeedbackCard point={makePoint({ severity })} />)
      expect(screen.getByText(severity)).toBeInTheDocument()
      unmount()
    }
  })

  it('shows suggestion block when provided', () => {
    render(<InlineFeedbackCard point={makePoint()} />)
    expect(screen.getByText('Suggestion')).toBeInTheDocument()
    expect(screen.getByText('Add a null check before accessing the property.')).toBeInTheDocument()
  })

  it('hides suggestion block when empty', () => {
    render(<InlineFeedbackCard point={makePoint({ suggestion: '' })} />)
    expect(screen.queryByText('Suggestion')).not.toBeInTheDocument()
  })

  it('renders file name', () => {
    render(<InlineFeedbackCard point={makePoint()} />)
    expect(screen.getByText(/src\/auth\.ts/)).toBeInTheDocument()
  })

  it('renders single-line range without dash', () => {
    render(<InlineFeedbackCard point={makePoint({ lineStart: 5, lineEnd: 5 })} />)
    expect(screen.getByText(/L5/)).toBeInTheDocument()
    expect(screen.queryByText(/L5–/)).not.toBeInTheDocument()
  })

  it('renders multi-line range with dash', () => {
    render(<InlineFeedbackCard point={makePoint({ lineStart: 10, lineEnd: 15 })} />)
    expect(screen.getByText(/L10–15/)).toBeInTheDocument()
  })
})
