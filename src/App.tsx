import { useState } from 'react'
import HealthCheck from './components/HealthCheck/HealthCheck'
import Sidebar from './components/Layout/Sidebar'
import PRList from './components/PRList/PRList'
import PRDetail from './components/PRDetail/PRDetail'

function App() {
  const [ready, setReady] = useState(false)
  const [activeView, setActiveView] = useState('prs')

  if (!ready) {
    return <HealthCheck onReady={() => setReady(true)} />
  }

  return (
    <div className="h-screen bg-gray-50 flex">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 flex overflow-hidden">
        {activeView === 'prs' && (
          <>
            <PRList />
            <PRDetail />
          </>
        )}
        {activeView !== 'prs' && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400 text-sm">
              {activeView === 'history' && 'Review history coming soon'}
              {activeView === 'settings' && 'Settings coming soon'}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
