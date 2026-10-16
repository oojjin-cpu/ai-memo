import { createClient, SupabaseClient } from '@supabase/supabase-js'

// 서버(서버 액션)에서만 사용한다. 키를 클라이언트 번들에 포함하지 않는다.
export const createSupabaseServerClient = (): SupabaseClient => {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY 환경변수가 필요합니다.'
    )
  }
  return createClient(url, key, { auth: { persistSession: false } })
}
