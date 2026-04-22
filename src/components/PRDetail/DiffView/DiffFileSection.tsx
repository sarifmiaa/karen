import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { FeedbackPoint } from '../../../stores/reviewStore'
import DiffHunkSection from './DiffHunkSection'
import InlineFeedbackCard from './InlineFeedbackCard'
import { buildFeedbackPlacement, fileMatches } from '../../../lib/parseDiff'
import type { ParsedFile } from '../../../lib/diffTypes'

interface Props {
  file: ParsedFile
  feedback: FeedbackPoint[]
}

export default function DiffFileSection({ file, feedback }: Props) {
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
