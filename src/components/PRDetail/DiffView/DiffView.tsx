import { useMemo } from 'react'
import type { FeedbackPoint } from '../../../stores/reviewStore'
import DiffFileSection from './DiffFileSection'
import InlineFeedbackCard from './InlineFeedbackCard'
import { fileMatches, parseDiff } from '../../../lib/parseDiff'

interface Props {
  diff: string
  feedback: FeedbackPoint[]
}

export default function DiffView({ diff, feedback }: Props) {
  const files = useMemo(() => parseDiff(diff), [diff])

  if (files.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-gray-400">No parseable diff</p>
      </div>
    )
  }

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
