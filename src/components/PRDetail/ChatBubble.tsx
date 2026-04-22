import { Loader2, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ConversationMessage } from '../../stores/reviewStore'

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

interface Props {
  message: ConversationMessage
  streaming?: boolean
}

export default function ChatBubble({ message, streaming }: Props) {
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
