import { create } from 'zustand'

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
      // Get current user
      const userResult = await window.api.exec('gh', ['api', '/user', '--jq', '.login'])
      const currentUser = userResult.stdout.trim()

      // Get orgs
      const orgsResult = await window.api.exec('gh', [
        'api', '/user/orgs', '--jq', '[.[] | {login, avatar_url}]'
      ])
      const orgs: Org[] = JSON.parse(orgsResult.stdout)

      set({ orgs, currentUser, loading: false })
    } catch (error) {
      console.error('Failed to fetch orgs:', error)
      set({ loading: false })
    }
  },

  setSelectedOrg: (org) => set({ selectedOrg: org }),
}))
