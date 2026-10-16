'use client'

import { useEffect } from 'react'
import { Memo, MEMO_CATEGORIES } from '@/types/memo'
import MarkdownViewer from './MarkdownViewer'

interface MemoDetailModalProps {
  memo: Memo | null
  onClose: () => void
  onEdit: (memo: Memo) => void
  onDelete: (id: string) => void
  onRetrySummary: (id: string) => void
}

export default function MemoDetailModal({
  memo,
  onClose,
  onEdit,
  onDelete,
  onRetrySummary,
}: MemoDetailModalProps) {
  useEffect(() => {
    if (!memo) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [memo, onClose])

  if (!memo) return null

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const handleDelete = () => {
    if (window.confirm('정말로 이 메모를 삭제하시겠습니까?')) {
      onDelete(memo.id)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      data-testid="memo-detail-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="memo-detail-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl"
        onClick={e => e.stopPropagation()}
        data-testid="memo-detail-modal"
      >
        {/* 헤더 */}
        <div className="border-b border-gray-200 p-6">
          <h2
            id="memo-detail-title"
            className="mb-3 break-words text-2xl font-bold text-gray-900"
          >
            {memo.title}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="rounded-full bg-blue-100 px-2 py-1 font-medium text-blue-800">
              {MEMO_CATEGORIES[memo.category as keyof typeof MEMO_CATEGORIES] ||
                memo.category}
            </span>
            <span>작성: {formatDate(memo.createdAt)}</span>
            <span>수정: {formatDate(memo.updatedAt)}</span>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6">
          {memo.summaryStatus && (
            <section
              aria-label="AI 요약"
              data-testid="memo-summary"
              className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4"
            >
              <h3 className="mb-2 text-sm font-semibold text-blue-800">
                ✨ AI 요약
              </h3>
              {memo.summaryStatus === 'pending' && (
                <p
                  data-testid="memo-summary-loading"
                  className="flex items-center gap-2 text-sm text-gray-600"
                >
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
                  요약 중...
                </p>
              )}
              {memo.summaryStatus === 'done' && (
                <p
                  data-testid="memo-summary-text"
                  className="whitespace-pre-wrap break-words text-sm text-gray-800"
                >
                  {memo.summary}
                </p>
              )}
              {memo.summaryStatus === 'failed' && (
                <div
                  data-testid="memo-summary-error"
                  className="flex items-center justify-between gap-2 text-sm text-red-600"
                >
                  <span>요약 실패</span>
                  <button
                    onClick={() => onRetrySummary(memo.id)}
                    data-testid="memo-summary-retry-btn"
                    className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    다시 시도
                  </button>
                </div>
              )}
            </section>
          )}
          <MarkdownViewer content={memo.content} />
          {memo.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {memo.tags.map((tag, index) => (
                <span
                  key={index}
                  className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 액션 */}
        <div className="flex justify-end gap-2 border-t border-gray-200 p-4">
          <button
            onClick={onClose}
            aria-label="닫기"
            data-testid="memo-detail-close-btn"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            닫기
          </button>
          <button
            onClick={() => onEdit(memo)}
            aria-label="메모 편집"
            data-testid="memo-detail-edit-btn"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            편집
          </button>
          <button
            onClick={handleDelete}
            aria-label="메모 삭제"
            data-testid="memo-detail-delete-btn"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}
