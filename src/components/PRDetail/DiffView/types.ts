export interface ParsedLine {
  type: 'context' | 'add' | 'remove'
  content: string
  oldLineNo: number | null
  newLineNo: number | null
}

export interface ParsedHunk {
  header: string
  lines: ParsedLine[]
}

export interface ParsedFile {
  oldPath: string
  newPath: string
  hunks: ParsedHunk[]
  additions: number
  deletions: number
}

export interface FeedbackPlacement {
  feedbackByLine: Map<number, import('../../../stores/reviewStore').FeedbackPoint[]>
  unmatched: import('../../../stores/reviewStore').FeedbackPoint[]
}
