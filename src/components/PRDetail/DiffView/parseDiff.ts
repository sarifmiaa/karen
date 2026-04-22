import type { FeedbackPoint } from '../../../stores/reviewStore'
import type { FeedbackPlacement, ParsedFile, ParsedHunk, ParsedLine } from './types'

export function parseDiff(raw: string): ParsedFile[] {
  const files: ParsedFile[] = []
  let file: ParsedFile | null = null
  let hunk: ParsedHunk | null = null
  let oldNo = 0
  let newNo = 0

  for (const line of raw.split('\n')) {
    if (line.startsWith('diff --git ')) {
      if (file) files.push(file)
      file = { oldPath: '', newPath: '', hunks: [], additions: 0, deletions: 0 }
      hunk = null
    } else if (line.startsWith('--- ') && file && !line.startsWith('--- /dev/null')) {
      file.oldPath = line.slice(4).replace(/^a\//, '')
    } else if (line.startsWith('+++ ') && file && !line.startsWith('+++ /dev/null')) {
      file.newPath = line.slice(4).replace(/^b\//, '')
    } else if (line.startsWith('@@ ') && file) {
      const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (m) {
        oldNo = parseInt(m[1], 10)
        newNo = parseInt(m[2], 10)
        hunk = { header: line, lines: [] }
        file.hunks.push(hunk)
      }
    } else if (hunk && file) {
      if (line.startsWith('+')) {
        hunk.lines.push({ type: 'add', content: line.slice(1), oldLineNo: null, newLineNo: newNo++ })
        file.additions++
      } else if (line.startsWith('-')) {
        hunk.lines.push({ type: 'remove', content: line.slice(1), oldLineNo: oldNo++, newLineNo: null })
        file.deletions++
      } else if (line.startsWith(' ')) {
        hunk.lines.push({ type: 'context', content: line.slice(1), oldLineNo: oldNo++, newLineNo: newNo++ } as ParsedLine)
      }
    }
  }

  if (file) files.push(file)
  return files.filter(f => (f.newPath || f.oldPath) && f.hunks.length > 0)
}

// True if the feedback's file path matches the parsed diff path.
// Handles cases where Claude returns shorter paths like "file.ts" or "src/file.ts".
export function fileMatches(fpFile: string, diffPath: string): boolean {
  if (!fpFile || !diffPath) return false
  return fpFile === diffPath
    || diffPath.endsWith('/' + fpFile)
    || diffPath.endsWith(fpFile)
}

export function buildFeedbackPlacement(hunks: ParsedHunk[], fileFeedback: FeedbackPoint[]): FeedbackPlacement {
  const feedbackByLine = new Map<number, FeedbackPoint[]>()
  const unmatched: FeedbackPoint[] = []

  const allNewLines: number[] = []
  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.newLineNo !== null) allNewLines.push(line.newLineNo)
    }
  }

  for (const fp of fileFeedback) {
    if (fp.lineEnd <= 0) {
      unmatched.push(fp)
      continue
    }

    const inRange = allNewLines.filter(n => n >= fp.lineStart && n <= fp.lineEnd)
    let insertAt: number | null = null

    if (inRange.length > 0) {
      insertAt = Math.max(...inRange)
    } else {
      insertAt = allNewLines.reduce<number | null>((best, n) => {
        if (best === null) return n
        return Math.abs(n - fp.lineEnd) < Math.abs(best - fp.lineEnd) ? n : best
      }, null)
    }

    if (insertAt !== null) {
      if (!feedbackByLine.has(insertAt)) feedbackByLine.set(insertAt, [])
      feedbackByLine.get(insertAt)!.push(fp)
    } else {
      unmatched.push(fp)
    }
  }

  return { feedbackByLine, unmatched }
}
