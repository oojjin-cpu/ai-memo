'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownViewerProps {
  content: string
  compact?: boolean
}

// 카드 미리보기용: 제목을 본문 크기로 줄이고 여백을 최소화
const COMPACT_CLASSES =
  '[&_h1]:!mb-1 [&_h1]:!border-0 [&_h1]:!pb-0 [&_h1]:!text-sm [&_h2]:!mb-1 [&_h2]:!text-sm [&_h3]:!mb-1 [&_h3]:!text-sm [&_p]:!mb-1 [&_ul]:!mb-1 [&_ol]:!mb-1 [&_pre]:!mb-1 [&_table]:!mb-1 [&_blockquote]:!mb-1'

// 원시 HTML은 렌더링하지 않으며(react-markdown 기본값), 외부 링크는 새 탭으로 연다
export default function MarkdownViewer({
  content,
  compact = false,
}: MarkdownViewerProps) {
  return (
    <div
      data-testid="markdown-viewer"
      className={`${compact ? COMPACT_CLASSES : ''} text-sm leading-relaxed text-gray-700 break-words [&_h1]:mb-3 [&_h1]:border-b [&_h1]:border-gray-200 [&_h1]:pb-1 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-900 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:mb-3 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:text-gray-500 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em] [&_pre]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-gray-100 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_a]:text-blue-600 [&_a]:underline [&_table]:mb-3 [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-50 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-gray-300 [&_td]:px-2 [&_td]:py-1 [&_hr]:my-4`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => {
            void node
            return <a {...props} target="_blank" rel="noopener noreferrer" />
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
