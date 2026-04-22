import { create } from 'zustand'

const LS_KEY = 'karen:selectedOrg'

interface Org {
  login: string
  avatar_url: string
}

interface OrgState {
  orgs: Org[]
  currentUser: string
  selectedOrg: string | null
  loading: boolean
  fetchOrgs: () => Promise<void>
  setSelectedOrg: (org: string | null) => void
}

export const useOrgStore = create<OrgState>((set) => ({
  orgs: [],
  currentUser: '',
  selectedOrg: null,
  loading: true,

  fetchOrgs: async () => {
    set({ loading: true })
    try {
      const userResult = await window.api.exec('gh', ['api', '/user', '--jq', '.login'])
      const currentUser = userResult.stdout.trim()

      const orgsResult = await window.api.exec('gh', [
        'api', '/user/orgs', '--jq', '[.[] | {login, avatar_url}]',
      ])
      const orgs: Org[] = JSON.parse(orgsResult.stdout)

      // Restore the last-used org from localStorage; fall back to personal account
      const stored = localStorage.getItem(LS_KEY)
      const validLogins = new Set([currentUser, ...orgs.map((o) => o.login)])
      const selectedOrg = stored && validLogins.has(stored) ? stored : currentUser

      set({ orgs, currentUser, selectedOrg, loading: false })
    } catch (error) {
      console.error('Failed to fetch orgs:', error)
      set({ loading: false })
    }
  },

  setSelectedOrg: (org) => {
    if (org) localStorage.setItem(LS_KEY, org)
    set({ selectedOrg: org })
  },
}))
