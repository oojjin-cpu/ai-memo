'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Memo, MemoFormData } from '@/types/memo'
import {
  createMemo as createMemoAction,
  deleteMemo as deleteMemoAction,
  getMemos,
  updateMemo as updateMemoAction,
  updateSummary,
} from '@/app/actions/memoActions'
import { requestSummary, shouldSummarize } from '@/utils/summarize'

type SummaryPatch = Pick<Memo, 'summary' | 'summaryStatus'>

export const useMemos = () => {
  const [memos, setMemos] = useState<Memo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // 메모 로드
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const loadedMemos = await getMemos()
        if (!cancelled) setMemos(loadedMemos)
      } catch (error) {
        console.error('Failed to load memos:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  // 요약 상태 반영. 요청 당시 본문과 현재 본문이 다르거나 메모가 삭제됐으면 서버가 폐기한다.
  const patchSummary = useCallback(
    async (
      id: string,
      requestedContent: string,
      patch: SummaryPatch
    ): Promise<void> => {
      const updated = await updateSummary(id, requestedContent, patch)
      if (!updated) return
      setMemos(prev => prev.map(memo => (memo.id === id ? updated : memo)))
    },
    []
  )

  // 요약 생성 (백그라운드)
  const runSummary = useCallback(
    async (id: string, content: string): Promise<void> => {
      try {
        await patchSummary(id, content, { summaryStatus: 'pending' })
        const summary = await requestSummary(content)
        await patchSummary(id, content, { summary, summaryStatus: 'done' })
      } catch (error) {
        console.error('Failed to summarize memo:', error)
        try {
          await patchSummary(id, content, { summaryStatus: 'failed' })
        } catch (patchError) {
          console.error('Failed to save summary status:', patchError)
        }
      }
    },
    [patchSummary]
  )

  // 메모 생성
  const createMemo = useCallback(
    async (formData: MemoFormData): Promise<Memo | null> => {
      try {
        const newMemo = await createMemoAction(formData)
        setMemos(prev => [newMemo, ...prev])

        if (shouldSummarize(newMemo.content)) {
          void runSummary(newMemo.id, newMemo.content)
        }
        return newMemo
      } catch (error) {
        console.error('Failed to create memo:', error)
        alert('메모를 저장하지 못했습니다. 다시 시도해주세요.')
        return null
      }
    },
    [runSummary]
  )

  // 메모 업데이트
  const updateMemo = useCallback(
    async (id: string, formData: MemoFormData): Promise<void> => {
      const existingMemo = memos.find(memo => memo.id === id)
      if (!existingMemo) return

      try {
        const updatedMemo = await updateMemoAction(id, formData)
        if (!updatedMemo) return
        setMemos(prev =>
          prev.map(memo => (memo.id === id ? updatedMemo : memo))
        )

        // 본문 변경 시, 또는 요약이 아직 없는 기존 메모를 수정할 때 요약
        const contentChanged = existingMemo.content !== formData.content
        const needsSummary =
          shouldSummarize(updatedMemo.content) &&
          (contentChanged || !existingMemo.summaryStatus)
        if (needsSummary) {
          void runSummary(id, updatedMemo.content)
        }
      } catch (error) {
        console.error('Failed to update memo:', error)
        alert('메모를 수정하지 못했습니다. 다시 시도해주세요.')
      }
    },
    [memos, runSummary]
  )

  // 요약 재시도
  const retrySummary = useCallback(
    (id: string): void => {
      const stored = memos.find(memo => memo.id === id)
      if (!stored || !shouldSummarize(stored.content)) return
      void runSummary(id, stored.content)
    },
    [memos, runSummary]
  )

  // 메모 삭제
  const deleteMemo = useCallback(async (id: string): Promise<void> => {
    try {
      await deleteMemoAction(id)
      setMemos(prev => prev.filter(memo => memo.id !== id))
    } catch (error) {
      console.error('Failed to delete memo:', error)
      alert('메모를 삭제하지 못했습니다. 다시 시도해주세요.')
    }
  }, [])

  // 메모 검색
  const searchMemos = useCallback((query: string): void => {
    setSearchQuery(query)
  }, [])

  // 카테고리 필터링
  const filterByCategory = useCallback((category: string): void => {
    setSelectedCategory(category)
  }, [])

  // 특정 메모 가져오기
  const getMemoById = useCallback(
    (id: string): Memo | undefined => {
      return memos.find(memo => memo.id === id)
    },
    [memos]
  )

  // 필터링된 메모 목록
  const filteredMemos = useMemo(() => {
    let filtered = memos

    // 카테고리 필터링
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(memo => memo.category === selectedCategory)
    }

    // 검색 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        memo =>
          memo.title.toLowerCase().includes(query) ||
          memo.content.toLowerCase().includes(query) ||
          memo.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [memos, selectedCategory, searchQuery])

  // 통계 정보
  const stats = useMemo(() => {
    const totalMemos = memos.length
    const categoryCounts = memos.reduce(
      (acc, memo) => {
        acc[memo.category] = (acc[memo.category] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return {
      total: totalMemos,
      byCategory: categoryCounts,
      filtered: filteredMemos.length,
    }
  }, [memos, filteredMemos])

  return {
    // 상태
    memos: filteredMemos,
    allMemos: memos,
    loading,
    searchQuery,
    selectedCategory,
    stats,

    // 메모 CRUD
    createMemo,
    updateMemo,
    deleteMemo,
    getMemoById,
    retrySummary,

    // 필터링 & 검색
    searchMemos,
    filterByCategory,
  }
}
