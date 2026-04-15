import { useEffect } from 'react'
import { GitPullRequest, BookOpen, Settings, Code2 } from 'lucide-react'
import { useOrgStore } from '../../stores/orgStore'
import OrgSelector from './OrgSelector'

interface SidebarProps {
  activeView: string
  onViewChange: (view: string) => void
}

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const fetchOrgs = useOrgStore((s) => s.fetchOrgs)

  useEffect(() => {
    fetchOrgs()
  }, [fetchOrgs])

  return (
    <div className="w-56 h-screen bg-zinc-950 border-r border-zinc-800/50 flex flex-col pt-10">
      {/* Logo */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center">
            <Code2 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">Karen</span>
        </div>
      </div>

      {/* Org selector */}
      <OrgSelector />

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5 mt-2">
        <NavItem
          icon={<GitPullRequest className="w-4 h-4" />}
          label="Pull requests"
          active={activeView === 'prs'}
          onClick={() => onViewChange('prs')}
        />
        <NavItem
          icon={<BookOpen className="w-4 h-4" />}
          label="Review history"
          active={activeView === 'history'}
          onClick={() => onViewChange('history')}
        />
        <NavItem
          icon={<Settings className="w-4 h-4" />}
          label="Settings"
          active={activeView === 'settings'}
          onClick={() => onViewChange('settings')}
        />
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-800/50">
        <p className="text-[11px] text-zinc-600">Karen v0.1.0</p>
      </div>
    </div>
  )
}

function NavItem({ icon, label, active, onClick }: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-violet-600/15 text-violet-400'
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
