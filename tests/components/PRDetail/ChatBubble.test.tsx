import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChatBubble from '../../../src/components/PRDetail/ChatBubble'

describe('ChatBubble', () => {
  it('renders user message content', () => {
    render(<ChatBubble message={{ role: 'user', content: 'Is this safe?' }} />)
    expect(screen.getByText('Is this safe?')).toBeInTheDocument()
  })

  it('renders assistant message content', () => {
    render(<ChatBubble message={{ role: 'assistant', content: 'Looks good to me.' }} />)
    expect(screen.getByText('Looks good to me.')).toBeInTheDocument()
  })

  it('renders assistant markdown as formatted text', () => {
    render(<ChatBubble message={{ role: 'assistant', content: '**bold text**' }} />)
    expect(screen.getByText('bold text')).toBeInTheDocument()
  })

  it('shows "Thinking…" when streaming with no content', () => {
    render(<ChatBubble message={{ role: 'assistant', content: '' }} streaming={true} />)
    expect(screen.getByText('Thinking…')).toBeInTheDocument()
  })

  it('shows "Thinking…" whenever content is empty, regardless of streaming', () => {
    render(<ChatBubble message={{ role: 'assistant', content: '' }} />)
    expect(screen.getByText('Thinking…')).toBeInTheDocument()
  })

  it('does not show "Thinking…" when content is present', () => {
    render(<ChatBubble message={{ role: 'assistant', content: 'Some response' }} streaming={true} />)
    expect(screen.queryByText('Thinking…')).not.toBeInTheDocument()
    expect(screen.getByText('Some response')).toBeInTheDocument()
  })
})
