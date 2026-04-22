import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import OverviewTab from '../../../src/components/PRDetail/OverviewTab'

describe('OverviewTab', () => {
  it('shows loading spinner when loading', () => {
    render(<OverviewTab body={null} loading={true} />)
    expect(screen.getByText('Loading description…')).toBeInTheDocument()
  })

  it('shows empty state when body is null', () => {
    render(<OverviewTab body={null} loading={false} />)
    expect(screen.getByText('No description provided')).toBeInTheDocument()
  })

  it('shows empty state when body is empty string', () => {
    render(<OverviewTab body="" loading={false} />)
    expect(screen.getByText('No description provided')).toBeInTheDocument()
  })

  it('renders the PR description text', () => {
    render(<OverviewTab body="This PR fixes a critical bug." loading={false} />)
    expect(screen.getByText('This PR fixes a critical bug.')).toBeInTheDocument()
  })

  it('renders markdown headings', () => {
    render(<OverviewTab body="## What changed" loading={false} />)
    expect(screen.getByText('What changed')).toBeInTheDocument()
  })

  it('loading state takes priority over body content', () => {
    render(<OverviewTab body="Should not show" loading={true} />)
    expect(screen.getByText('Loading description…')).toBeInTheDocument()
    expect(screen.queryByText('Should not show')).not.toBeInTheDocument()
  })
})
