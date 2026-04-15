import { useState } from 'react'
import HealthCheck from './components/HealthCheck/HealthCheck'
import Sidebar from './components/Layout/Sidebar'

function App() {
  const [ready, setReady] = useState(false)
  const [activeView, setActiveView] = useState('prs')

  if (!ready) {
    return <HealthCheck onReady={() => setReady(true)} />
  }

  return (
    <div className="h-screen bg-zinc-950 flex">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 flex items-center justify-center">
        <p className="text-zinc-600 text-sm">
          {activeView === 'prs' && 'PR list coming next'}
          {activeView === 'history' && 'Review history coming soon'}
          {activeView === 'settings' && 'Settings coming soon'}
        </p>
      </main>
    </div>
  )
}

export default App
