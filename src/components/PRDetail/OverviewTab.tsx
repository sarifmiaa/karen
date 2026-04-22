import { Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  body: string | null
  loading: boolean
}

export default function OverviewTab({ body, loading }: Props) {
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
