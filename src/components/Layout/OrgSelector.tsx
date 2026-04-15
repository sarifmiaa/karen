import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Building2, User, Globe } from 'lucide-react'
import { useOrgStore } from '../../stores/orgStore'

export default function OrgSelector() {
  const { orgs, currentUser, selectedOrg, setSelectedOrg, loading } = useOrgStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (loading) {
    return (
      <div className="mx-2 px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
        <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
      </div>
    )
  }

  const displayName = selectedOrg || 'All orgs'

  return (
    <div ref={ref} className="relative mx-2 mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 transition-colors"
      >
        {selectedOrg ? (
          <Building2 className="w-3.5 h-3.5 text-zinc-500" />
        ) : (
          <Globe className="w-3.5 h-3.5 text-zinc-500" />
        )}
        <span className="text-xs font-medium text-zinc-300 flex-1 text-left truncate">
          {displayName}
        </span>
        <ChevronDown className={`w-3 h-3 text-zinc-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 py-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
          {/* All orgs option */}
          <button
            onClick={() => { setSelectedOrg(null); setOpen(false) }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-zinc-800 transition-colors ${
              !selectedOrg ? 'text-violet-400' : 'text-zinc-400'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            All orgs
          </button>

          {/* Divider */}
          <div className="my-1 border-t border-zinc-800" />

          {/* Personal */}
          <button
            onClick={() => { setSelectedOrg(currentUser); setOpen(false) }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-zinc-800 transition-colors ${
              selectedOrg === currentUser ? 'text-violet-400' : 'text-zinc-400'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            {currentUser}
            <span className="ml-auto text-[10px] text-zinc-600">personal</span>
          </button>

          {/* Orgs */}
          {orgs.map((org) => (
            <button
              key={org.login}
              onClick={() => { setSelectedOrg(org.login); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-zinc-800 transition-colors ${
                selectedOrg === org.login ? 'text-violet-400' : 'text-zinc-400'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              {org.login}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
