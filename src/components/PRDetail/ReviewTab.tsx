import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  AlertTriangle, ChevronDown, ChevronUp, Clock, Loader2,
  MessageCircle, RefreshCw, RotateCcw, Send, Sparkles, X,
} from 'lucide-react'
import { useReviewStore } from '../../stores/reviewStore'
import type { PR } from '../../stores/prStore'
import ChatBubble from './ChatBubble'
import DiffView from './DiffView'
import { timeAgoMs } from './utils'

const QUICK_ACTIONS = ['Explain this PR', 'Security concerns?', 'Suggest tests']

interface Props {
  pr: PR
}

export default function ReviewTab({ pr }: Props) {
  const {
    loading, reviewPhase, rawOutput, summary, feedback, diff, error,
    conversation, chatLoading, chatStreamingContent, reviewedAt,
    startReview, cancel, reset, sendChatMessage, loadStoredReview,
  } = useReviewStore()

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

  useEffect(() => {
    cancel()
    reset()
    loadStoredReview(pr)
    return () => { cancel() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pr.repoFullName, pr.number])

  useEffect(() => {
    if (phase === 'loading') setTerminalCollapsed(false)
    else if (phase === 'done') setTerminalCollapsed(true)
  }, [phase])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [rawOutput])

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
      <div className="flex-1 overflow-y-auto">

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

        {(phase === 'loading' || phase === 'done' || phase === 'error') && (
          <div className="mx-4 mt-4 rounded-xl overflow-hidden border border-zinc-700 shrink-0">
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

        {phase === 'done' && (
          <div className="px-4 pt-4 space-y-3">
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

            {summary && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Summary
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
              </div>
            )}

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

      {reviewDone && (
        <div className="shrink-0 border-t border-gray-100 bg-gray-50/80 backdrop-blur-sm px-4 pt-3 pb-4">
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
