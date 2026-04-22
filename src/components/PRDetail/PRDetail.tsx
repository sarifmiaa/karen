import { useState, useEffect } from 'react'
import { GitPullRequest, GitBranch } from 'lucide-react'
import { usePRStore, type PR } from '../../stores/prStore'
import OverviewTab from './OverviewTab'
import ReviewTab from './ReviewTab'
import { timeAgo } from './utils'

type Tab = 'overview' | 'files' | 'review'

export default function PRDetail() {
  const selectedPR = usePRStore((s) => s.selectedPR)

  if (!selectedPR) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Select a pull request</p>
      </div>
    )
  }

  return <PRDetailInner key={`${selectedPR.repoFullName}#${selectedPR.number}`} pr={selectedPR} />
}

function PRDetailInner({ pr }: { pr: PR }) {
  const updatePR = usePRStore((s) => s.updatePR)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [body, setBody] = useState<string | null>(null)
  const [loadingBody, setLoadingBody] = useState(false)

  useEffect(() => {
    setActiveTab('overview')
    setBody(null)
    setLoadingBody(true)

    window.api.exec('gh', [
      'pr', 'view', String(pr.number),
      '--repo', pr.repoFullName,
      '--json', 'body,headRefName,baseRefName,additions,deletions',
    ]).then((result) => {
      const data: {
        body?: string
        headRefName?: string
        baseRefName?: string
        additions?: number
        deletions?: number
      } = JSON.parse(result.stdout)
      setBody(data.body?.trim() ?? null)
      updatePR(pr.repoFullName, pr.number, {
        headRef: data.headRefName ?? '',
        baseRef: data.baseRefName ?? '',
        additions: data.additions ?? 0,
        deletions: data.deletions ?? 0,
      })
    }).catch(() => {
      setBody(null)
    }).finally(() => {
      setLoadingBody(false)
    })
  }, [pr.repoFullName, pr.number, updatePR])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'files',    label: 'Files changed' },
    { id: 'review',   label: 'Claude review' },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div className="px-6 pt-5 pb-4 border-b border-gray-200">
        <h1 className="text-base font-semibold text-gray-900 leading-snug mb-2">{pr.title}</h1>

        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className="text-[11px] font-mono text-gray-500">{pr.repoFullName}</span>
          <span className="text-gray-300">·</span>
          <GitBranch className="w-3 h-3 text-gray-400" />
          <span className="text-[11px] font-mono text-gray-600">{pr.headRef}</span>
          <span className="text-gray-400 text-xs">→</span>
          <span className="text-[11px] font-mono text-gray-600">{pr.baseRef}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
            pr.isDraft ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-700'
          }`}>
            <GitPullRequest className="w-3 h-3" />
            {pr.isDraft ? 'Draft' : 'Open'}
          </span>

          <span className="text-[11px] font-mono text-[#1a7f37]">+{pr.additions}</span>
          <span className="text-[11px] font-mono text-[#cf222e]">-{pr.deletions}</span>

          <span className="text-[11px] text-gray-400 ml-auto">
            {pr.author} · {timeAgo(pr.updatedAt)}
          </span>
        </div>
      </div>

      <div className="flex border-b border-gray-200 px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-1 py-3 mr-6 text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-violet-600 text-violet-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={`flex-1 ${activeTab === 'review' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
        {activeTab === 'overview' && <OverviewTab body={body} loading={loadingBody} />}
        {activeTab === 'files' && (
          <div className="flex items-center justify-center py-24">
            <p className="text-sm text-gray-400">Files changed coming soon</p>
          </div>
        )}
        {activeTab === 'review' && <ReviewTab pr={pr} />}
      </div>
    </div>
  )
}
