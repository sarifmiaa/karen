import { create } from 'zustand'

export interface PR {
  number: number
  title: string
  state: string
  author: string
  repo: string
  repoFullName: string
  createdAt: string
  updatedAt: string
  isDraft: boolean
  additions: number
  deletions: number
  headRef: string
  baseRef: string
  labels: string[]
  reviewDecision: string
  url: string
}

interface PRState {
  prs: PR[]
  selectedPR: PR | null
  loading: boolean
  filter: 'all' | 'review' | 'mine'
  fetchPRs: (org: string | null, currentUser: string, allOrgs: string[]) => Promise<void>
  setSelectedPR: (pr: PR | null) => void
  setFilter: (filter: 'all' | 'review' | 'mine') => void
}

export const usePRStore = create<PRState>((set) => ({
  prs: [],
  selectedPR: null,
  loading: false,
  filter: 'all',

  fetchPRs: async (org, currentUser, allOrgs) => {
    set({ loading: true, prs: [] })

    // If org is selected, fetch just that. Otherwise fetch all orgs + personal.
    const owners = org ? [org] : [currentUser, ...allOrgs]
    console.log('[PRStore] Fetching for owners:', owners)

    try {
      const allPRs: PR[] = []

      for (const owner of owners) {
        if (!owner) continue
        try {
          const reposResult = await window.api.exec('gh', [
            'repo', 'list', owner,
            '--json', 'nameWithOwner',
            '--limit', '100',
            '--no-archived',
          ])
          const repos: { nameWithOwner: string }[] = JSON.parse(reposResult.stdout)
          console.log(`[PRStore] ${owner}: ${repos.length} repos`)

          const batchSize = 10
          for (let i = 0; i < repos.length; i += batchSize) {
            const batch = repos.slice(i, i + batchSize)
            const results = await Promise.allSettled(
              batch.map((repo) => fetchRepoPRs(repo.nameWithOwner))
            )
            for (const result of results) {
              if (result.status === 'fulfilled') {
                allPRs.push(...result.value)
              }
            }
          }
        } catch (err) {
          console.log(`[PRStore] Failed for ${owner}:`, err)
        }
      }

      allPRs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      console.log('[PRStore] Total PRs:', allPRs.length)

      set({ prs: allPRs, loading: false })
    } catch (error) {
      console.error('[PRStore] Error:', error)
      set({ loading: false })
    }
  },

  setSelectedPR: (pr) => set({ selectedPR: pr }),
  setFilter: (filter) => set({ filter }),
}))

async function fetchRepoPRs(repoFullName: string): Promise<PR[]> {
  const result = await window.api.exec('gh', [
    'pr', 'list',
    '--repo', repoFullName,
    '--state', 'open',
    '--json', 'number,title,state,author,createdAt,updatedAt,isDraft,additions,deletions,headRefName,baseRefName,labels,reviewDecision,url',
    '--limit', '30',
  ])
  const raw = JSON.parse(result.stdout)
  return raw.map((pr: any) => ({
    number: pr.number,
    title: pr.title,
    state: pr.state,
    author: pr.author?.login || 'unknown',
    repo: repoFullName.split('/')[1],
    repoFullName,
    createdAt: pr.createdAt,
    updatedAt: pr.updatedAt,
    isDraft: pr.isDraft,
    additions: pr.additions,
    deletions: pr.deletions,
    headRef: pr.headRefName,
    baseRef: pr.baseRefName,
    labels: pr.labels?.map((l: any) => l.name) || [],
    reviewDecision: pr.reviewDecision || '',
    url: pr.url,
  }))
}
