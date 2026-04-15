import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Loader2, Terminal, ArrowRight } from 'lucide-react'

type Status = 'checking' | 'ok' | 'missing' | 'auth-failed'

interface ToolCheck {
  name: string
  description: string
  status: Status
  version?: string
  detail?: string
  installUrl: string
  installCmd: string
}

export default function HealthCheck({ onReady }: { onReady: () => void }) {
  const [tools, setTools] = useState<ToolCheck[]>([
    {
      name: 'GitHub CLI',
      description: 'Used to fetch repos, PRs, and post reviews',
      status: 'checking',
      installUrl: 'https://cli.github.com',
      installCmd: 'brew install gh && gh auth login',
    },
    {
      name: 'Claude Code',
      description: 'Powers AI-driven code reviews and chat',
      status: 'checking',
      installUrl: 'https://docs.anthropic.com/en/docs/claude-code',
      installCmd: 'npm install -g @anthropic-ai/claude-code',
    },
  ])

  const allReady = tools.every((t) => t.status === 'ok')
  const doneChecking = tools.every((t) => t.status !== 'checking')

  useEffect(() => {
    checkTools()
  }, [])

  async function checkTools() {
    // Check GitHub CLI
    try {
      const ghVersion = await window.api.exec('gh', ['--version'])
      const version = ghVersion.stdout.split('\n')[0] || ghVersion.stdout
      
      // Check auth
      try {
        await window.api.exec('gh', ['auth', 'status'])
        updateTool(0, { status: 'ok', version: version.trim() })
      } catch {
        updateTool(0, {
          status: 'auth-failed',
          version: version.trim(),
          detail: 'Installed but not authenticated. Run: gh auth login',
        })
      }
    } catch {
      updateTool(0, { status: 'missing' })
    }

    // Check Claude Code
    try {
      const claudeVersion = await window.api.exec('claude', ['--version'])
      updateTool(1, { status: 'ok', version: claudeVersion.stdout.trim() })
    } catch {
      updateTool(1, { status: 'missing' })
    }
  }

  function updateTool(index: number, updates: Partial<ToolCheck>) {
    setTools((prev) =>
      prev.map((t, i) => (i === index ? { ...t, ...updates } : t))
    )
  }

  function recheck() {
    setTools((prev) => prev.map((t) => ({ ...t, status: 'checking' as Status, version: undefined, detail: undefined })))
    setTimeout(checkTools, 500)
  }

  return (
    <div className="h-screen bg-zinc-950 flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        {/* Logo and title */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 mb-5">
            <Terminal className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Karen</h1>
          <p className="text-sm text-zinc-500 mt-1">PR review powered by Claude Code</p>
        </div>

        {/* Tool checks */}
        <div className="space-y-3">
          {tools.map((tool, i) => (
            <div
              key={i}
              className={`rounded-xl border p-4 transition-all duration-300 ${
                tool.status === 'ok'
                  ? 'border-emerald-800/50 bg-emerald-950/20'
                  : tool.status === 'checking'
                  ? 'border-zinc-800 bg-zinc-900/50'
                  : 'border-red-900/50 bg-red-950/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {tool.status === 'checking' && (
                    <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
                  )}
                  {tool.status === 'ok' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  )}
                  {(tool.status === 'missing' || tool.status === 'auth-failed') && (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{tool.name}</span>
                    {tool.version && (
                      <span className="text-xs text-zinc-600 font-mono">{tool.version}</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{tool.description}</p>

                  {tool.status === 'missing' && (
                    <div className="mt-3 rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                      <p className="text-xs text-zinc-400 mb-2">Install with:</p>
                      <code className="text-xs text-amber-400 font-mono break-all">
                        {tool.installCmd}
                      </code>
                    </div>
                  )}

                  {tool.status === 'auth-failed' && (
                    <div className="mt-3 rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                      <p className="text-xs text-red-400">{tool.detail}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center gap-3">
          {doneChecking && !allReady && (
            <button
              onClick={recheck}
              className="px-4 py-2.5 rounded-lg border border-zinc-800 text-sm text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
            >
              Recheck
            </button>
          )}
          {allReady && (
            <button
              onClick={onReady}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm font-medium text-white transition-colors"
            >
              Continue to Karen
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status summary */}
        {doneChecking && !allReady && (
          <p className="text-center text-xs text-zinc-600 mt-4">
            Install the missing tools above, then click Recheck
          </p>
        )}
      </div>
    </div>
  )
}
