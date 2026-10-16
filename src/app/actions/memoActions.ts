'use server'

import { v4 as uuidv4 } from 'uuid'
import { Memo, MemoFormData, SummaryStatus } from '@/types/memo'
import { createSupabaseServerClient } from '@/utils/supabaseServer'

type SummaryPatch = Pick<Memo, 'summary' | 'summaryStatus'>

interface MemoRow {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  created_at: string
  updated_at: string
  summary: string | null
  summary_status: SummaryStatus | null
}

const TABLE = 'memos'

const toMemo = (row: MemoRow): Memo => ({
  id: row.id,
  title: row.title,
  content: row.content,
  category: row.category,
  tags: row.tags ?? [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  ...(row.summary !== null && { summary: row.summary }),
  ...(row.summary_status !== null && { summaryStatus: row.summary_status }),
})

export async function getMemos(): Promise<Memo[]> {
  const supabase = createSupabaseServerClient()

  // 응답을 받지 못한 채 남은 요약은 실패로 정정 (다시 시도 가능)
  const { error: normalizeError } = await supabase
    .from(TABLE)
    .update({ summary_status: 'failed' })
    .eq('summary_status', 'pending')
  if (normalizeError) throw new Error(normalizeError.message)

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as MemoRow[]).map(toMemo)
}

export async function createMemo(formData: MemoFormData): Promise<Memo> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      id: uuidv4(),
      title: formData.title,
      content: formData.content,
      category: formData.category,
      tags: formData.tags,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return toMemo(data as MemoRow)
}

export async function updateMemo(
  id: string,
  formData: MemoFormData
): Promise<Memo | null> {
  const supabase = createSupabaseServerClient()

  const { data: existing, error: findError } = await supabase
    .from(TABLE)
    .select('content')
    .eq('id', id)
    .maybeSingle()
  if (findError) throw new Error(findError.message)
  if (!existing) return null

  // 본문이 바뀌면 이전 요약은 오래된 값이므로 제거
  const contentChanged = existing.content !== formData.content
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      title: formData.title,
      content: formData.content,
      category: formData.category,
      tags: formData.tags,
      updated_at: new Date().toISOString(),
      ...(contentChanged && { summary: null, summary_status: null }),
    })
    .eq('id', id)
    .select('*')
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? toMemo(data as MemoRow) : null
}

export async function deleteMemo(id: string): Promise<void> {
  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// 요약 상태 반영. 요청 당시 본문과 현재 본문이 다르거나 메모가 삭제됐으면 null(폐기).
export async function updateSummary(
  id: string,
  requestedContent: string,
  patch: SummaryPatch
): Promise<Memo | null> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      ...(patch.summary !== undefined && { summary: patch.summary }),
      summary_status: patch.summaryStatus ?? null,
    })
    .eq('id', id)
    .eq('content', requestedContent)
    .select('*')
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? toMemo(data as MemoRow) : null
}
