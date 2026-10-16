// 서버에서 GEMINI_MODEL 환경변수로 덮어쓸 수 있다
export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite'

// 이 길이 미만의 메모는 요약하지 않는다
export const MIN_SUMMARY_LENGTH = 100

// 서버로 전송할 수 있는 본문 최대 길이
export const MAX_SUMMARY_INPUT_LENGTH = 20000

export const shouldSummarize = (content: string): boolean =>
  content.trim().length >= MIN_SUMMARY_LENGTH

export const requestSummary = async (content: string): Promise<string> => {
  const response = await fetch('/api/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })

  if (!response.ok) {
    throw new Error(`Summary request failed: ${response.status}`)
  }

  const data: { summary?: unknown } = await response.json()
  if (typeof data.summary !== 'string' || !data.summary.trim()) {
    throw new Error('Summary response is empty')
  }

  return data.summary.trim()
}
