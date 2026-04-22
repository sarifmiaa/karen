import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Building2, User } from 'lucide-react'
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
      <div className="mx-2 px-3 py-2 rounded-lg bg-gray-100 border border-gray-200">
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  const Icon = selectedOrg === currentUser ? User : Building2

  return (
    <div ref={ref} className="relative mx-2 mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 hover:border-gray-300 transition-colors"
      >
        <Icon className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs font-medium text-gray-700 flex-1 text-left truncate">
          {selectedOrg || currentUser}
        </span>
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 py-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {/* Personal */}
          <button
            onClick={() => { setSelectedOrg(currentUser); setOpen(false) }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
              selectedOrg === currentUser ? 'text-violet-600' : 'text-gray-600'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            {currentUser}
            <span className="ml-auto text-[10px] text-gray-400">personal</span>
          </button>

          {/* Orgs */}
          {orgs.map((org) => (
            <button
              key={org.login}
              onClick={() => { setSelectedOrg(org.login); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                selectedOrg === org.login ? 'text-violet-600' : 'text-gray-600'
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
