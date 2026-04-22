import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { FeedbackPoint } from '../../stores/reviewStore'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParsedLine {
  type: 'context' | 'add' | 'remove'
  content: string
  oldLineNo: number | null
  newLineNo: number | null
}

interface ParsedHunk {
  header: string
  lines: ParsedLine[]
}

interface ParsedFile {
  oldPath: string
  newPath: string
  hunks: ParsedHunk[]
  additions: number
  deletions: number
}

// ── Parser ────────────────────────────────────────────────────────────────────

function parseDiff(raw: string): ParsedFile[] {
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
        hunk.lines.push({ type: 'context', content: line.slice(1), oldLineNo: oldNo++, newLineNo: newNo++ })
      }
      // skip "\ No newline at end of file" etc.
    }
  }

  if (file) files.push(file)
  return files.filter(f => (f.newPath || f.oldPath) && f.hunks.length > 0)
}

// ── Feedback placement ────────────────────────────────────────────────────────

// True if the feedback's file path matches the parsed diff path
// Handles cases where Claude returns shorter paths like "file.ts" or "src/file.ts"
function fileMatches(fpFile: string, diffPath: string): boolean {
  if (!fpFile || !diffPath) return false
  return fpFile === diffPath
    || diffPath.endsWith('/' + fpFile)
    || diffPath.endsWith(fpFile)
}

interface FeedbackPlacement {
  feedbackByLine: Map<number, FeedbackPoint[]>
  unmatched: FeedbackPoint[]
}

function buildFeedbackPlacement(hunks: ParsedHunk[], fileFeedback: FeedbackPoint[]): FeedbackPlacement {
  const feedbackByLine = new Map<number, FeedbackPoint[]>()
  const unmatched: FeedbackPoint[] = []

  // Collect all new line numbers across all hunks
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

    // Best insertion: largest newLineNo that falls within [lineStart, lineEnd]
    const inRange = allNewLines.filter(n => n >= fp.lineStart && n <= fp.lineEnd)
    let insertAt: number | null = null

    if (inRange.length > 0) {
      insertAt = Math.max(...inRange)
    } else {
      // Fallback: closest line to lineEnd
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

// ── Severity config ───────────────────────────────────────────────────────────

const SEV = {
  high:   { badge: 'bg-red-100 text-red-700',     bar: 'bg-red-400',   bg: 'bg-red-50',   border: 'border-red-200'   },
  medium: { badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-400', bg: 'bg-amber-50', border: 'border-amber-200' },
  low:    { badge: 'bg-green-100 text-green-700', bar: 'bg-green-400', bg: 'bg-green-50', border: 'border-green-200' },
  info:   { badge: 'bg-blue-100 text-blue-700',   bar: 'bg-blue-400',  bg: 'bg-blue-50',  border: 'border-blue-200'  },
} as const

// ── Inline feedback card (GitHub comment style) ───────────────────────────────

function InlineFeedbackCard({ point }: { point: FeedbackPoint }) {
  const s = SEV[point.severity] ?? SEV.info

  return (
    <div className={`flex rounded-lg border ${s.border} ${s.bg} overflow-hidden my-1.5 text-left`}>
      <div className={`w-1 shrink-0 ${s.bar}`} />
      <div className="flex-1 p-3 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${s.badge}`}>
            {point.severity}
          </span>
          <span className="text-xs font-medium text-gray-900">{point.title}</span>
          {point.file && (
            <span className="text-[10px] font-mono text-gray-400 ml-auto truncate hidden sm:block">
              {point.file}
              {point.lineStart > 0 && ` L${point.lineStart}${point.lineEnd !== point.lineStart ? `–${point.lineEnd}` : ''}`}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">{point.description}</p>
        {point.suggestion && (
          <div className="mt-2 rounded bg-white/80 border border-white/60 px-2.5 py-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
              Suggestion
            </p>
            <p className="text-xs text-gray-700 leading-relaxed font-mono">{point.suggestion}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Hunk ──────────────────────────────────────────────────────────────────────

interface DiffHunkSectionProps {
  hunk: ParsedHunk
  feedbackByLine: Map<number, FeedbackPoint[]>
}

function DiffHunkSection({ hunk, feedbackByLine }: DiffHunkSectionProps) {
  return (
    <>
      {/* Hunk header row */}
      <tr>
        <td
          colSpan={4}
          className="bg-[#ddf4ff] border-y border-[#b6e3ff] px-4 py-0.5 select-none"
        >
          <code className="text-[10px] text-[#0969da] font-mono">{hunk.header}</code>
        </td>
      </tr>

      {hunk.lines.map((line, li) => {
        const isAdd = line.type === 'add'
        const isRem = line.type === 'remove'
        const feedbackHere = line.newLineNo !== null ? (feedbackByLine.get(line.newLineNo) ?? []) : []

        return (
          <Fragment key={li}>
            <tr className={isAdd ? 'bg-[#e6ffed]' : isRem ? 'bg-[#ffebe9]' : 'bg-white'}>
              {/* Old line number */}
              <td
                className={`w-12 min-w-[3rem] text-right pr-3 pl-2 select-none font-mono text-[11px] border-r border-gray-200 ${
                  isAdd ? 'bg-[#ccffd8] text-[#1a7f37]'
                  : isRem ? 'bg-[#ffd7d5] text-[#cf222e]'
                  : 'bg-[#f6f8fa] text-gray-400'
                }`}
              >
                {line.oldLineNo ?? ''}
              </td>
              {/* New line number */}
              <td
                className={`w-12 min-w-[3rem] text-right pr-3 select-none font-mono text-[11px] border-r border-gray-200 ${
                  isAdd ? 'bg-[#ccffd8] text-[#1a7f37]'
                  : isRem ? 'bg-[#ffd7d5] text-[#cf222e]'
                  : 'bg-[#f6f8fa] text-gray-400'
                }`}
              >
                {line.newLineNo ?? ''}
              </td>
              {/* +/- marker */}
              <td
                className={`w-5 min-w-[1.25rem] text-center select-none font-mono text-[11px] ${
                  isAdd ? 'text-[#1a7f37]' : isRem ? 'text-[#cf222e]' : 'text-gray-300'
                }`}
              >
                {isAdd ? '+' : isRem ? '-' : ' '}
              </td>
              {/* Code */}
              <td className="pl-2 pr-6 font-mono text-[11px] text-gray-800 whitespace-pre">
                {line.content || ' '}
              </td>
            </tr>

            {/* Inline feedback cards after their target line */}
            {feedbackHere.length > 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-0 bg-white border-y border-gray-100">
                  {feedbackHere.map(fp => (
                    <InlineFeedbackCard key={fp.id} point={fp} />
                  ))}
                </td>
              </tr>
            )}
          </Fragment>
        )
      })}
    </>
  )
}

// ── File section ──────────────────────────────────────────────────────────────

interface DiffFileSectionProps {
  file: ParsedFile
  feedback: FeedbackPoint[]
}

function DiffFileSection({ file, feedback }: DiffFileSectionProps) {
  const [collapsed, setCollapsed] = useState(false)
  const displayPath = file.newPath || file.oldPath

  const fileFeedback = useMemo(
    () => feedback.filter(fp => fileMatches(fp.file, file.newPath) || fileMatches(fp.file, file.oldPath)),
    [feedback, file.newPath, file.oldPath],
  )

  const { feedbackByLine, unmatched } = useMemo(
    () => buildFeedbackPlacement(file.hunks, fileFeedback),
    [file.hunks, fileFeedback],
  )

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden text-xs">
      {/* File header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-[#f6f8fa] hover:bg-gray-100 transition-colors text-left"
      >
        {collapsed
          ? <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          : <ChevronDown  className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        }
        <code className="text-xs font-mono text-gray-700 flex-1 truncate">{displayPath}</code>
        <div className="flex items-center gap-2.5 shrink-0 ml-2">
          {fileFeedback.length > 0 && (
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              {fileFeedback.length} {fileFeedback.length === 1 ? 'note' : 'notes'}
            </span>
          )}
          <span className="font-mono text-[11px] text-[#1a7f37]">+{file.additions}</span>
          <span className="font-mono text-[11px] text-[#cf222e]">-{file.deletions}</span>
        </div>
      </button>

      {!collapsed && (
        <>
          <div className="overflow-x-auto border-t border-gray-200">
            <table className="w-full border-collapse">
              <tbody>
                {file.hunks.map((hunk, hi) => (
                  <DiffHunkSection key={hi} hunk={hunk} feedbackByLine={feedbackByLine} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Feedback that couldn't be placed on a specific line */}
          {unmatched.length > 0 && (
            <div className="p-3 space-y-1.5 border-t border-gray-200 bg-gray-50">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                General comments
              </p>
              {unmatched.map(fp => (
                <InlineFeedbackCard key={fp.id} point={fp} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

interface DiffViewProps {
  diff: string
  feedback: FeedbackPoint[]
}

export default function DiffView({ diff, feedback }: DiffViewProps) {
  const files = useMemo(() => parseDiff(diff), [diff])

  if (files.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-gray-400">No parseable diff</p>
      </div>
    )
  }

  // Feedback not matched to any parsed file path
  const allDiffPaths = files.flatMap(f => [f.newPath, f.oldPath])
  const orphanFeedback = feedback.filter(
    fp => fp.file && !allDiffPaths.some(p => fileMatches(fp.file, p)),
  )

  return (
    <div className="space-y-2">
      {files.map((file, i) => (
        <DiffFileSection key={i} file={file} feedback={feedback} />
      ))}

      {orphanFeedback.length > 0 && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-3 py-2 bg-[#f6f8fa] border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-600">General feedback</p>
          </div>
          <div className="p-3 space-y-1.5">
            {orphanFeedback.map(fp => (
              <InlineFeedbackCard key={fp.id} point={fp} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
