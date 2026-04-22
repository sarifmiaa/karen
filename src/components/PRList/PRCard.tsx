import { GitPullRequest, FileCode2 } from 'lucide-react'
import type { PR } from '../../stores/prStore'

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function PRCard({ pr, selected, onClick }: {
  pr: PR
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
        selected
          ? 'bg-violet-50 border-l-2 border-l-violet-500'
          : 'hover:bg-gray-50 border-l-2 border-l-transparent'
      }`}
    >
      {/* Repo name */}
      <div className="flex items-center gap-1.5 mb-1">
        <FileCode2 className="w-3 h-3 text-gray-400" />
        <span className="text-[11px] text-gray-400 font-mono truncate">{pr.repo}</span>
        <span className="text-[11px] text-gray-300 ml-auto">#{pr.number}</span>
      </div>

      {/* Title */}
      <p className="text-[13px] text-gray-800 leading-snug line-clamp-2 mb-1.5">{pr.title}</p>

      {/* Meta row */}
      <div className="flex items-center gap-2 text-[11px]">
        <div className="flex items-center gap-1">
          {pr.isDraft ? (
            <GitPullRequest className="w-3 h-3 text-gray-400" />
          ) : (
            <GitPullRequest className="w-3 h-3 text-emerald-500" />
          )}
          <span className={pr.isDraft ? 'text-gray-400' : 'text-emerald-600'}>
            {pr.isDraft ? 'Draft' : 'Open'}
          </span>
        </div>

        <span className="text-gray-300">·</span>
        <span className="text-gray-500">{pr.author}</span>
        <span className="text-gray-400 ml-auto">{timeAgo(pr.updatedAt)}</span>
      </div>

      {/* Additions/deletions — only shown once detail is loaded (not available from search) */}
      {(pr.additions > 0 || pr.deletions > 0) && (
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-emerald-600 font-mono">+{pr.additions}</span>
          <span className="text-[10px] text-red-500 font-mono">-{pr.deletions}</span>
        </div>
      )}
    </button>
  )
}
