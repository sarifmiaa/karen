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
  assignees: string[]
  requestedReviewers: string[]
}

interface PRState {
  prs: PR[]
  selectedPR: PR | null
  loading: boolean
  filter: 'all' | 'assigned' | 'reviewer'
  fetchPRs: (org: string | null, currentUser: string, allOrgs: string[]) => Promise<void>
  setSelectedPR: (pr: PR | null) => void
  setFilter: (filter: 'all' | 'assigned' | 'reviewer') => void
  updatePR: (repoFullName: string, number: number, data: Partial<PR>) => void
}

export const usePRStore = create<PRState>((set) => ({
  prs: [],
  selectedPR: null,
  loading: false,
  filter: 'all',

  fetchPRs: async (org, currentUser, allOrgs) => {
    set({ loading: true, prs: [] })

    // When a specific org is selected fetch only that scope, otherwise all orgs + personal.
    const owners = org ? [org] : [currentUser, ...allOrgs]

    try {
      const allPRs: PR[] = []
      const seen = new Set<string>()

      for (const owner of owners) {
        if (!owner) continue
        try {
          // gh search prs doesn't expose reviewRequests — run a second search
          // in parallel to discover which PRs have the user as a requested reviewer.
          const FIELDS = 'number,title,state,author,createdAt,updatedAt,isDraft,url,assignees,labels,repository'
          const [involvesRes, reviewRes] = await Promise.allSettled([
            window.api.exec('gh', [
              'search', 'prs', '--state', 'open',
              '--involves', '@me',
              '--owner', owner,
              '--json', FIELDS,
              '--limit', '100',
            ]),
            window.api.exec('gh', [
              'search', 'prs', '--state', 'open',
              '--review-requested', '@me',
              '--owner', owner,
              '--json', 'number,repository',
              '--limit', '100',
            ]),
          ])

          // Build a set of keys where review was explicitly requested
          const reviewRequestedKeys = new Set<string>()
          if (reviewRes.status === 'fulfilled') {
            const reviewRaw: { number: number; repository: { nameWithOwner: string } | null }[] =
              JSON.parse(reviewRes.value.stdout)
            for (const r of reviewRaw) {
              if (r.repository?.nameWithOwner) {
                reviewRequestedKeys.add(`${r.repository.nameWithOwner}#${r.number}`)
              }
            }
          }

          if (involvesRes.status !== 'fulfilled') continue

          const raw: SearchPRResult[] = JSON.parse(involvesRes.value.stdout)

          for (const pr of raw) {
            const repoFullName = pr.repository?.nameWithOwner
            if (!repoFullName) continue

            const key = `${repoFullName}#${pr.number}`
            if (seen.has(key)) continue
            seen.add(key)

            allPRs.push({
              number: pr.number,
              title: pr.title,
              state: pr.state,
              author: pr.author?.login ?? 'unknown',
              repo: repoFullName.split('/')[1],
              repoFullName,
              createdAt: pr.createdAt,
              updatedAt: pr.updatedAt,
              isDraft: pr.isDraft,
              // Not available from search — populated when the PR is opened
              additions: 0,
              deletions: 0,
              headRef: '',
              baseRef: '',
              labels: pr.labels?.map((l) => l.name) ?? [],
              reviewDecision: '',
              url: pr.url,
              assignees: pr.assignees?.map((a) => a.login) ?? [],
              requestedReviewers: reviewRequestedKeys.has(key) ? [currentUser] : [],
            })
          }
        } catch (err) {
          console.warn(`[PRStore] Search failed for ${owner}:`, err)
        }
      }

      allPRs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      set({ prs: allPRs, loading: false })
    } catch (error) {
      console.error('[PRStore] Error:', error)
      set({ loading: false })
    }
  },

  setSelectedPR: (pr) => set({ selectedPR: pr }),
  setFilter: (filter) => set({ filter }),

  // Called by PRDetail once it fetches the full PR object
  updatePR: (repoFullName, number, data) => {
    set((s) => ({
      prs: s.prs.map((p) =>
        p.repoFullName === repoFullName && p.number === number ? { ...p, ...data } : p,
      ),
      selectedPR:
        s.selectedPR?.repoFullName === repoFullName && s.selectedPR?.number === number
          ? { ...s.selectedPR, ...data }
          : s.selectedPR,
    }))
  },
}))

// ── Local types for gh search prs JSON output ─────────────────────────────────

interface SearchPRResult {
  number: number
  title: string
  state: string
  author: { login: string } | null
  createdAt: string
  updatedAt: string
  isDraft: boolean
  url: string
  assignees: { login: string }[]
  labels: { name: string }[]
  repository: { nameWithOwner: string } | null
}
