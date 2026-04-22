import { Fragment } from 'react'
import type { FeedbackPoint } from '../../../stores/reviewStore'
import InlineFeedbackCard from './InlineFeedbackCard'
import type { ParsedHunk } from './types'

interface Props {
  hunk: ParsedHunk
  feedbackByLine: Map<number, FeedbackPoint[]>
}

export default function DiffHunkSection({ hunk, feedbackByLine }: Props) {
  return (
    <>
      <tr>
        <td colSpan={4} className="bg-[#ddf4ff] border-y border-[#b6e3ff] px-4 py-0.5 select-none">
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
              <td className={`w-12 min-w-[3rem] text-right pr-3 pl-2 select-none font-mono text-[11px] border-r border-gray-200 ${
                isAdd ? 'bg-[#ccffd8] text-[#1a7f37]' : isRem ? 'bg-[#ffd7d5] text-[#cf222e]' : 'bg-[#f6f8fa] text-gray-400'
              }`}>
                {line.oldLineNo ?? ''}
              </td>
              <td className={`w-12 min-w-[3rem] text-right pr-3 select-none font-mono text-[11px] border-r border-gray-200 ${
                isAdd ? 'bg-[#ccffd8] text-[#1a7f37]' : isRem ? 'bg-[#ffd7d5] text-[#cf222e]' : 'bg-[#f6f8fa] text-gray-400'
              }`}>
                {line.newLineNo ?? ''}
              </td>
              <td className={`w-5 min-w-[1.25rem] text-center select-none font-mono text-[11px] ${
                isAdd ? 'text-[#1a7f37]' : isRem ? 'text-[#cf222e]' : 'text-gray-300'
              }`}>
                {isAdd ? '+' : isRem ? '-' : ' '}
              </td>
              <td className="pl-2 pr-6 font-mono text-[11px] text-gray-800 whitespace-pre">
                {line.content || ' '}
              </td>
            </tr>

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
