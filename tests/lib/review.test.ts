import { describe, it, expect } from 'vitest'
import {
  parseReviewOutput,
  unwrapClaudeOutput,
  buildPrompt,
  buildChatPrompt,
} from '../../src/lib/review'
import type { PR } from '../../src/stores/prStore'
import type { FeedbackPoint, ConversationMessage } from '../../src/lib/review'

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
  additions: 10,
  deletions: 5,
  headRef: 'fix/auth',
  baseRef: 'main',
  labels: [],
  reviewDecision: '',
  url: 'https://github.com/org/myrepo/pull/42',
  assignees: [],
  requestedReviewers: [],
}

// ── parseReviewOutput ─────────────────────────────────────────────────────────

describe('parseReviewOutput', () => {
  it('parses direct JSON', () => {
    const input = JSON.stringify({ summary: 'Looks good', feedback: [] })
    expect(parseReviewOutput(input)).toEqual({ summary: 'Looks good', feedback: [] })
  })

  it('unwraps claude CLI envelope then parses inner JSON', () => {
    const inner = { summary: 'LGTM', feedback: [] }
    const envelope = JSON.stringify({ type: 'result', result: JSON.stringify(inner), session_id: 'abc' })
    expect(parseReviewOutput(envelope)).toEqual(inner)
  })

  it('extracts JSON from a ```json code block', () => {
    const inner = { summary: 'Good', feedback: [] }
    const input = `Here is my review:\n\`\`\`json\n${JSON.stringify(inner)}\n\`\`\``
    expect(parseReviewOutput(input)).toEqual(inner)
  })

  it('extracts JSON from a plain ``` code block', () => {
    const inner = { summary: 'Good', feedback: [] }
    const input = `\`\`\`\n${JSON.stringify(inner)}\n\`\`\``
    expect(parseReviewOutput(input)).toEqual(inner)
  })

  it('extracts outermost JSON object as last resort', () => {
    const input = `Some preamble { "summary": "Noted", "feedback": [] } trailing text`
    expect(parseReviewOutput(input)).toEqual({ summary: 'Noted', feedback: [] })
  })

  it('returns null for completely invalid input', () => {
    expect(parseReviewOutput('not json at all')).toBeNull()
    expect(parseReviewOutput('')).toBeNull()
  })

  it('returns null when required fields are missing', () => {
    expect(parseReviewOutput('{"summary":"ok"}')).toBeNull()
    expect(parseReviewOutput('{"feedback":[]}')).toBeNull()
  })
})

// ── unwrapClaudeOutput ────────────────────────────────────────────────────────

describe('unwrapClaudeOutput', () => {
  it('unwraps claude CLI envelope', () => {
    const input = JSON.stringify({ result: 'Hello!' })
    expect(unwrapClaudeOutput(input)).toBe('Hello!')
  })

  it('returns the raw string when not an envelope', () => {
    expect(unwrapClaudeOutput('plain text')).toBe('plain text')
  })

  it('trims surrounding whitespace', () => {
    expect(unwrapClaudeOutput('  trimmed  ')).toBe('trimmed')
  })
})

// ── buildPrompt ───────────────────────────────────────────────────────────────

describe('buildPrompt', () => {
  it('includes PR metadata', () => {
    const prompt = buildPrompt('diff content', mockPR)
    expect(prompt).toContain('org/myrepo')
    expect(prompt).toContain('PR #42')
    expect(prompt).toContain('Fix auth bug')
    expect(prompt).toContain('alice')
    expect(prompt).toContain('fix/auth → main')
  })

  it('wraps diff in <diff> tags', () => {
    const prompt = buildPrompt('+ some code', mockPR)
    expect(prompt).toContain('<diff>\n+ some code\n</diff>')
  })

  it('instructs Claude to return JSON only', () => {
    const prompt = buildPrompt('diff', mockPR)
    expect(prompt).toContain('Return only valid JSON')
  })
})

// ── buildChatPrompt ───────────────────────────────────────────────────────────

describe('buildChatPrompt', () => {
  const base = {
    diff: null,
    summary: null,
    feedback: [] as FeedbackPoint[],
    conversation: [] as ConversationMessage[],
    pr: mockPR,
  }

  it('includes PR metadata and the developer question', () => {
    const prompt = buildChatPrompt('What does this do?', base)
    expect(prompt).toContain('org/myrepo')
    expect(prompt).toContain('PR #42')
    expect(prompt).toContain('What does this do?')
  })

  it('includes diff when provided', () => {
    const prompt = buildChatPrompt('?', { ...base, diff: 'the diff' })
    expect(prompt).toContain('<diff>\nthe diff\n</diff>')
  })

  it('omits diff section when null', () => {
    const prompt = buildChatPrompt('?', base)
    expect(prompt).not.toContain('<diff>')
  })

  it('includes summary when provided', () => {
    const prompt = buildChatPrompt('?', { ...base, summary: 'Looks good' })
    expect(prompt).toContain('Review summary: Looks good')
  })

  it('formats feedback findings with severity and location', () => {
    const fp: FeedbackPoint = {
      id: 'fp_0', severity: 'high', file: 'src/auth.ts',
      lineStart: 10, lineEnd: 15, title: 'SQL injection',
      description: 'desc', suggestion: 'fix', posted: false,
    }
    const prompt = buildChatPrompt('?', { ...base, feedback: [fp] })
    expect(prompt).toContain('[HIGH] src/auth.ts L10–15: SQL injection')
  })

  it('formats conversation history with correct speaker labels', () => {
    const conversation: ConversationMessage[] = [
      { role: 'user', content: 'Is this safe?' },
      { role: 'assistant', content: 'No, it is not.' },
    ]
    const prompt = buildChatPrompt('Follow up?', { ...base, conversation })
    expect(prompt).toContain('Developer: Is this safe?')
    expect(prompt).toContain('Claude: No, it is not.')
  })

  it('omits conversation section when empty', () => {
    const prompt = buildChatPrompt('?', base)
    expect(prompt).not.toContain('Conversation so far')
  })
})
