import type { FeedbackPoint } from '../../../stores/reviewStore'

const SEV = {
  high:   { badge: 'bg-red-100 text-red-700',     bar: 'bg-red-400',   bg: 'bg-red-50',   border: 'border-red-200'   },
  medium: { badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-400', bg: 'bg-amber-50', border: 'border-amber-200' },
  low:    { badge: 'bg-green-100 text-green-700', bar: 'bg-green-400', bg: 'bg-green-50', border: 'border-green-200' },
  info:   { badge: 'bg-blue-100 text-blue-700',   bar: 'bg-blue-400',  bg: 'bg-blue-50',  border: 'border-blue-200'  },
} as const

export default function InlineFeedbackCard({ point }: { point: FeedbackPoint }) {
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
