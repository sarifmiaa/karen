import { useEffect } from 'react'
import { GitPullRequest, Loader2, MessageSquare } from 'lucide-react'
import { usePRStore } from '../../stores/prStore'
import { useOrgStore } from '../../stores/orgStore'
import PRCard from './PRCard'

export default function PRList() {
  const { prs, loading, filter, setFilter, fetchPRs, selectedPR, setSelectedPR } = usePRStore()
  const { selectedOrg, currentUser, orgs } = useOrgStore()

  useEffect(() => {
    if (currentUser) {
      const orgLogins = orgs.map((o) => o.login)
      fetchPRs(selectedOrg, currentUser, orgLogins)
    }
  }, [selectedOrg, currentUser, orgs, fetchPRs])

  const filteredPRs = prs.filter((pr) => {
    if (filter === 'review') return pr.reviewDecision === 'REVIEW_REQUIRED' || pr.reviewDecision === ''
    if (filter === 'mine') return pr.author === currentUser
    return true
  })

  return (
    <div className="w-80 h-full border-r border-zinc-800/50 flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-3">
          <GitPullRequest className="w-4 h-4 text-zinc-500" />
          <h2 className="text-sm font-medium text-white">Pull requests</h2>
          {!loading && (
            <span className="ml-auto text-[11px] text-zinc-600 font-mono">{filteredPRs.length}</span>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-1">
          {(['all', 'review', 'mine'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                filter === f
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {f === 'all' ? 'All' : f === 'review' ? 'Needs review' : 'Mine'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
            <p className="text-xs text-zinc-600">Fetching PRs...</p>
          </div>
        )}

        {!loading && filteredPRs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <MessageSquare className="w-5 h-5 text-zinc-700" />
            <p className="text-xs text-zinc-600">No open pull requests</p>
          </div>
        )}

        {!loading && filteredPRs.map((pr) => (
          <PRCard
            key={`${pr.repoFullName}#${pr.number}`}
            pr={pr}
            selected={selectedPR?.number === pr.number && selectedPR?.repoFullName === pr.repoFullName}
            onClick={() => setSelectedPR(pr)}
          />
        ))}
      </div>
    </div>
  )
}
