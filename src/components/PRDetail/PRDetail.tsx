import { useState, useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import {
  GitPullRequest, GitBranch, Loader2, Sparkles, AlertTriangle, RefreshCw, X,
  Send, MessageCircle, ChevronDown, ChevronUp, Clock, RotateCcw,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { usePRStore, type PR } from '../../stores/prStore'
import { useReviewStore, type ConversationMessage } from '../../stores/reviewStore'
import DiffView from './DiffView'

type Tab = 'overview' | 'files' | 'review'

const QUICK_ACTIONS = ['Explain this PR', 'Security concerns?', 'Suggest tests']

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function timeAgoMs(ms: number): string {
  return timeAgo(new Date(ms).toISOString())
}

export default function PRDetail() {
  const selectedPR = usePRStore((s) => s.selectedPR)

  if (!selectedPR) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Select a pull request</p>
      </div>
    )
  }

  return <PRDetailInner key={`${selectedPR.repoFullName}#${selectedPR.number}`} pr={selectedPR} />
}

function PRDetailInner({ pr }: { pr: PR }) {
  const updatePR = usePRStore((s) => s.updatePR)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [body, setBody] = useState<string | null>(null)
  const [loadingBody, setLoadingBody] = useState(false)

  useEffect(() => {
    setActiveTab('overview')
    setBody(null)
    setLoadingBody(true)

    // Single call: fetch body + fields that aren't returned by gh search prs
    window.api.exec('gh', [
      'pr', 'view', String(pr.number),
      '--repo', pr.repoFullName,
      '--json', 'body,headRefName,baseRefName,additions,deletions',
    ]).then((result) => {
      const data: {
        body?: string
        headRefName?: string
        baseRefName?: string
        additions?: number
        deletions?: number
      } = JSON.parse(result.stdout)
      setBody(data.body?.trim() ?? null)
      updatePR(pr.repoFullName, pr.number, {
        headRef: data.headRefName ?? '',
        baseRef: data.baseRefName ?? '',
        additions: data.additions ?? 0,
        deletions: data.deletions ?? 0,
      })
    }).catch(() => {
      setBody(null)
    }).finally(() => {
      setLoadingBody(false)
    })
  }, [pr.repoFullName, pr.number, updatePR])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'files',    label: 'Files changed' },
    { id: 'review',   label: 'Claude review' },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-gray-200">
        <h1 className="text-base font-semibold text-gray-900 leading-snug mb-2">{pr.title}</h1>

        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className="text-[11px] font-mono text-gray-500">{pr.repoFullName}</span>
          <span className="text-gray-300">·</span>
          <GitBranch className="w-3 h-3 text-gray-400" />
          <span className="text-[11px] font-mono text-gray-600">{pr.headRef}</span>
          <span className="text-gray-400 text-xs">→</span>
          <span className="text-[11px] font-mono text-gray-600">{pr.baseRef}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
            pr.isDraft ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-700'
          }`}>
            <GitPullRequest className="w-3 h-3" />
            {pr.isDraft ? 'Draft' : 'Open'}
          </span>

          <span className="text-[11px] font-mono text-[#1a7f37]">+{pr.additions}</span>
          <span className="text-[11px] font-mono text-[#cf222e]">-{pr.deletions}</span>

          <span className="text-[11px] text-gray-400 ml-auto">
            {pr.author} · {timeAgo(pr.updatedAt)}
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-1 py-3 mr-6 text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-violet-600 text-violet-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content — review tab owns its own scroll + sticky input */}
      <div className={`flex-1 ${activeTab === 'review' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
        {activeTab === 'overview' && (
          <OverviewTab body={body} loading={loadingBody} />
        )}
        {activeTab === 'files' && (
          <div className="flex items-center justify-center py-24">
            <p className="text-sm text-gray-400">Files changed coming soon</p>
          </div>
        )}
        {activeTab === 'review' && (
          <ReviewTab pr={pr} />
        )}
      </div>
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ body, loading }: { body: string | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16">
        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        <span className="text-sm text-gray-400">Loading description…</span>
      </div>
    )
  }

  if (!body) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-gray-400">No description provided</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-lg font-semibold text-gray-900 mb-3 mt-5 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-semibold text-gray-900 mb-2 mt-5 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-900 mb-2 mt-4 first:mt-0">{children}</h3>,
          p: ({ children }) => <p className="text-sm text-gray-700 leading-relaxed mb-3 last:mb-0">{children}</p>,
          a: ({ href, children }) => <a href={href} className="text-violet-600 hover:underline">{children}</a>,
          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
          em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-')
            return isBlock
              ? <code className={`${className} block bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono text-gray-800 overflow-x-auto mb-3`}>{children}</code>
              : <code className="bg-gray-100 text-gray-800 text-xs font-mono px-1.5 py-0.5 rounded">{children}</code>
          },
          pre: ({ children }) => <pre className="mb-3">{children}</pre>,
          ul: ({ children }) => <ul className="list-disc list-inside text-sm text-gray-700 mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside text-sm text-gray-700 mb-3 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-200 pl-4 my-3 text-gray-500 italic">{children}</blockquote>,
          hr: () => <hr className="border-gray-200 my-4" />,
          table: ({ children }) => <div className="overflow-x-auto mb-3"><table className="text-sm text-gray-700 border-collapse w-full">{children}</table></div>,
          th: ({ children }) => <th className="text-left text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 px-3 py-2">{children}</th>,
          td: ({ children }) => <td className="border border-gray-200 px-3 py-2 text-sm">{children}</td>,
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  )
}

// ── Chat markdown components ──────────────────────────────────────────────────

const chatMd = {
  p: ({ children }: { children?: React.ReactNode }) =>
    <p className="text-sm text-gray-800 leading-relaxed mb-2 last:mb-0">{children}</p>,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) =>
    <a href={href} className="text-violet-600 hover:underline">{children}</a>,
  strong: ({ children }: { children?: React.ReactNode }) =>
    <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) =>
    <em className="italic">{children}</em>,
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
    const isBlock = className?.includes('language-')
    return isBlock
      ? <code className={`${className} block bg-gray-100 border border-gray-200 rounded p-2.5 text-xs font-mono text-gray-800 overflow-x-auto my-2`}>{children}</code>
      : <code className="bg-gray-100 text-gray-800 text-xs font-mono px-1 py-0.5 rounded">{children}</code>
  },
  pre: ({ children }: { children?: React.ReactNode }) => <pre className="my-2">{children}</pre>,
  ul: ({ children }: { children?: React.ReactNode }) =>
    <ul className="list-disc list-inside text-sm text-gray-800 mb-2 space-y-0.5">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) =>
    <ol className="list-decimal list-inside text-sm text-gray-800 mb-2 space-y-0.5">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }: { children?: React.ReactNode }) =>
    <blockquote className="border-l-4 border-gray-200 pl-3 my-2 text-gray-500 italic text-sm">{children}</blockquote>,
  h1: ({ children }: { children?: React.ReactNode }) =>
    <p className="text-sm font-semibold text-gray-900 mb-1 mt-2">{children}</p>,
  h2: ({ children }: { children?: React.ReactNode }) =>
    <p className="text-sm font-semibold text-gray-900 mb-1 mt-2">{children}</p>,
  h3: ({ children }: { children?: React.ReactNode }) =>
    <p className="text-sm font-medium text-gray-900 mb-1 mt-1">{children}</p>,
}

// ── Chat bubble ───────────────────────────────────────────────────────────────

function ChatBubble({ message, streaming }: { message: ConversationMessage; streaming?: boolean }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-violet-600 px-3.5 py-2.5">
          <p className="text-sm text-white leading-relaxed">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2 items-start">
      <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-3 h-3 text-violet-500" />
      </div>
      <div className={`max-w-[85%] rounded-2xl rounded-tl-sm bg-white border px-3.5 py-2.5 shadow-sm ${
        streaming ? 'border-violet-200' : 'border-gray-200'
      }`}>
        {message.content ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={chatMd}>
            {message.content}
          </ReactMarkdown>
        ) : (
          <span className="flex items-center gap-1.5 text-sm text-gray-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Thinking…
          </span>
        )}
        {streaming && message.content && (
          <span className="inline-block w-1.5 h-3.5 bg-violet-400 rounded-sm animate-pulse ml-0.5 align-text-bottom" />
        )}
      </div>
    </div>
  )
}

// ── Review tab ────────────────────────────────────────────────────────────────

function ReviewTab({ pr }: { pr: PR }) {
  const {
    loading, reviewPhase, rawOutput, summary, feedback, diff, error,
    conversation, chatLoading, chatStreamingContent, reviewedAt,
    startReview, cancel, reset, sendChatMessage, loadStoredReview,
  } = useReviewStore()

  // Compute phase before effects so effects can depend on it
  const phase: 'idle' | 'loading' | 'error' | 'done' =
    loading ? 'loading'
    : error   ? 'error'
    : summary !== null ? 'done'
    : 'idle'

  const reviewDone = summary !== null

  const terminalRef = useRef<HTMLDivElement>(null)
  const chatEndRef  = useRef<HTMLDivElement>(null)
  const [chatInput, setChatInput] = useState('')
  const [terminalCollapsed, setTerminalCollapsed] = useState(false)

  // Load stored review (or clear) when PR changes
  useEffect(() => {
    cancel()
    reset()
    loadStoredReview(pr)
    return () => { cancel() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pr.repoFullName, pr.number])

  // Auto-manage terminal: expand while reviewing, collapse when done
  useEffect(() => {
    if (phase === 'loading') setTerminalCollapsed(false)
    else if (phase === 'done') setTerminalCollapsed(true)
  }, [phase])

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [rawOutput])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation.length, chatStreamingContent])

  function handleSend(text: string) {
    const trimmed = text.trim()
    if (!trimmed || chatLoading || loading) return
    setChatInput('')
    sendChatMessage(trimmed, pr)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend(chatInput)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Scrollable content ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Idle — start review CTA */}
        {phase === 'idle' && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-violet-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900 mb-1">AI Code Review</p>
              <p className="text-xs text-gray-500">
                Claude will analyze the diff and surface issues with file and line references
              </p>
            </div>
            <button
              onClick={() => startReview(pr)}
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-medium text-white transition-colors shadow-sm"
            >
              Review this PR
            </button>
          </div>
        )}

        {/* Terminal panel */}
        {(phase === 'loading' || phase === 'done' || phase === 'error') && (
          <div className="mx-4 mt-4 rounded-xl overflow-hidden border border-zinc-700 shrink-0">
            {/* Chrome bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 border-b border-zinc-700">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
                <span className="text-[11px] text-zinc-400 font-mono ml-2">claude</span>
              </div>

              <div className="flex items-center gap-3">
                {phase === 'loading' && (
                  <>
                    <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {reviewPhase === 'fetching-diff' ? 'Fetching diff…' : 'Reviewing…'}
                    </span>
                    <button
                      onClick={cancel}
                      className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </>
                )}

                {/* Collapse/expand when not loading */}
                {phase !== 'loading' && (
                  <button
                    onClick={() => setTerminalCollapsed(c => !c)}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    {terminalCollapsed
                      ? <><ChevronDown className="w-3 h-3" /> Show output</>
                      : <><ChevronUp className="w-3 h-3" /> Hide output</>
                    }
                  </button>
                )}
              </div>
            </div>

            {!terminalCollapsed && (
              <div
                ref={terminalRef}
                className="bg-zinc-950 p-3 font-mono text-xs text-green-400 h-44 overflow-y-auto"
              >
                <pre className="whitespace-pre-wrap break-all">
                  {rawOutput || (reviewPhase === 'fetching-diff'
                    ? `$ gh pr diff ${pr.number} --repo ${pr.repoFullName}`
                    : reviewPhase === 'reviewing'
                    ? '$ claude -p "..." — waiting for response…'
                    : '')}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <div className="mx-4 mt-3">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-700 mb-0.5">Review failed</p>
                <p className="text-xs text-red-600 leading-relaxed">{error}</p>
              </div>
            </div>
            <button
              onClick={() => startReview(pr)}
              className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try again
            </button>
          </div>
        )}

        {/* Results */}
        {phase === 'done' && (
          <div className="px-4 pt-4 space-y-3">
            {/* Reviewed-at bar */}
            {reviewedAt && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                  <Clock className="w-3 h-3" />
                  Reviewed {timeAgoMs(reviewedAt)}
                </span>
                <button
                  onClick={() => startReview(pr)}
                  className="flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-500 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Re-review
                </button>
              </div>
            )}

            {/* Summary */}
            {summary && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Summary
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
              </div>
            )}

            {/* Diff view with inline feedback — the main event */}
            {diff ? (
              feedback.length > 0
                ? <DiffView diff={diff} feedback={feedback} />
                : (
                  <>
                    <DiffView diff={diff} feedback={[]} />
                    <p className="text-xs text-center text-gray-400 py-2">No issues found</p>
                  </>
                )
            ) : null}
          </div>
        )}

        {/* Chat conversation thread */}
        {reviewDone && conversation.length > 0 && (
          <div className="px-4 pt-4 pb-4 space-y-3">
            <div className="border-t border-gray-100 pt-3">
              {conversation.map((msg, i) => (
                <div key={i} className="mb-3">
                  <ChatBubble message={msg} />
                </div>
              ))}
              {chatLoading && (
                <ChatBubble
                  message={{ role: 'assistant', content: chatStreamingContent }}
                  streaming
                />
              )}
            </div>
            <div ref={chatEndRef} />
          </div>
        )}

        {reviewDone && conversation.length === 0 && <div ref={chatEndRef} />}
      </div>

      {/* ── Sticky chat input — only after review ───────────────────────── */}
      {reviewDone && (
        <div className="shrink-0 border-t border-gray-100 bg-gray-50/80 backdrop-blur-sm px-4 pt-3 pb-4">
          {/* Quick-action chips */}
          <div className="flex flex-wrap gap-1.5 mb-2.5 items-center">
            <span className="flex items-center gap-1 text-[10px] font-medium text-gray-400 mr-0.5">
              <MessageCircle className="w-3 h-3" />
              Ask:
            </span>
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                onClick={() => handleSend(action)}
                disabled={chatLoading || loading}
                className="px-2.5 py-1 rounded-full bg-white border border-gray-200 text-[11px] text-gray-600
                           hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50
                           disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {action}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div className="flex gap-2 items-end">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a follow-up question… (⌘↵ to send)"
              disabled={chatLoading || loading}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5
                         text-sm text-gray-900 placeholder-gray-400 leading-relaxed
                         focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent
                         disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              style={{ minHeight: '2.5rem', maxHeight: '8rem' }}
              onInput={(e) => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = `${Math.min(el.scrollHeight, 128)}px`
              }}
            />
            <button
              onClick={() => handleSend(chatInput)}
              disabled={!chatInput.trim() || chatLoading || loading}
              className="w-9 h-9 shrink-0 rounded-xl bg-violet-600 hover:bg-violet-500
                         disabled:opacity-40 disabled:cursor-not-allowed
                         flex items-center justify-center transition-colors"
            >
              {chatLoading
                ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                : <Send className="w-4 h-4 text-white" />
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
