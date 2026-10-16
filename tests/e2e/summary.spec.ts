import { expect, Page, Route, test } from '@playwright/test'

const SUMMARY_URL = '**/api/summarize'
const LONG_CONTENT =
  '오늘은 팀 회의에서 다음 분기 로드맵을 논의했다. 핵심 안건은 신규 기능 우선순위 조정과 기술 부채 해소 일정이며, 각 팀은 이번 주 금요일까지 세부 계획을 공유하기로 했다. 추가로 배포 주기를 격주로 변경하는 안도 검토되었다.'
const SHORT_CONTENT = '짧은 메모입니다.'

const fulfillSummary = (route: Route, summary: string) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ summary }),
  })

const createMemo = async (page: Page, title: string, content: string) => {
  await page.getByRole('button', { name: '새 메모' }).click()
  await page.getByPlaceholder('메모 제목을 입력하세요').fill(title)
  await page.getByLabel('메모 내용').fill(content)
  await page.getByRole('button', { name: '저장하기' }).click()
  await expect(page.getByRole('button', { name: '저장하기' })).toBeHidden()
}

const editMemo = async (
  page: Page,
  title: string,
  changes: { title?: string; content?: string }
) => {
  await page
    .getByTestId('memo-card')
    .filter({ hasText: title })
    .getByTitle('편집')
    .click()
  if (changes.title !== undefined) {
    await page.getByPlaceholder('메모 제목을 입력하세요').fill(changes.title)
  }
  if (changes.content !== undefined) {
    await page.getByLabel('메모 내용').fill(changes.content)
  }
  await page.getByRole('button', { name: '수정하기' }).click()
  await expect(page.getByRole('button', { name: '수정하기' })).toBeHidden()
}

const openDetail = async (page: Page, title: string) => {
  await page.getByTestId('memo-card').filter({ hasText: title }).click()
  await expect(page.getByTestId('memo-detail-modal')).toBeVisible()
}

test.describe('메모 AI 요약', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /메모 앱/ })).toBeVisible()
  })

  test('긴 메모는 요약 중 상태를 거쳐 요약문이 표시된다', async ({ page }) => {
    let release: () => void = () => {}
    const gate = new Promise<void>(resolve => (release = resolve))
    await page.route(SUMMARY_URL, async route => {
      await gate
      await fulfillSummary(route, '팀 회의에서 다음 분기 로드맵을 논의했다.')
    })

    await createMemo(page, '요약 성공 메모', LONG_CONTENT)
    await openDetail(page, '요약 성공 메모')

    await expect(page.getByTestId('memo-summary-loading')).toBeVisible()
    release()
    await expect(page.getByTestId('memo-summary-text')).toHaveText(
      '팀 회의에서 다음 분기 로드맵을 논의했다.'
    )
    await expect(page.getByTestId('memo-summary-loading')).toBeHidden()
  })

  test('요약 실패 시 다시 시도로 복구할 수 있다', async ({ page }) => {
    let calls = 0
    await page.route(SUMMARY_URL, route => {
      calls += 1
      if (calls === 1) {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'fail' }),
        })
      }
      return fulfillSummary(route, '재시도 후 생성된 요약')
    })

    await createMemo(page, '요약 실패 메모', LONG_CONTENT)
    await openDetail(page, '요약 실패 메모')

    await expect(page.getByTestId('memo-summary-error')).toBeVisible()
    await page.getByTestId('memo-summary-retry-btn').click()
    await expect(page.getByTestId('memo-summary-text')).toHaveText(
      '재시도 후 생성된 요약'
    )
    expect(calls).toBe(2)
  })

  test('짧은 메모는 요약하지 않고 요약 영역도 숨긴다', async ({ page }) => {
    let calls = 0
    await page.route(SUMMARY_URL, route => {
      calls += 1
      return fulfillSummary(route, '호출되면 안 됨')
    })

    await createMemo(page, '짧은 메모', SHORT_CONTENT)
    await openDetail(page, '짧은 메모')

    await expect(page.getByTestId('memo-summary')).toBeHidden()
    expect(calls).toBe(0)
  })

  test('본문을 수정하면 재요약하고, 제목만 수정하면 재요약하지 않는다', async ({
    page,
  }) => {
    let calls = 0
    await page.route(SUMMARY_URL, route => {
      calls += 1
      return fulfillSummary(route, `요약 ${calls}`)
    })

    await createMemo(page, '수정 메모', LONG_CONTENT)
    await openDetail(page, '수정 메모')
    await expect(page.getByTestId('memo-summary-text')).toHaveText('요약 1')
    await page.getByTestId('memo-detail-close-btn').click()

    await editMemo(page, '수정 메모', { content: `${LONG_CONTENT} 추가 내용` })
    await openDetail(page, '수정 메모')
    await expect(page.getByTestId('memo-summary-text')).toHaveText('요약 2')
    await page.getByTestId('memo-detail-close-btn').click()

    await editMemo(page, '수정 메모', { title: '제목만 변경' })
    await openDetail(page, '제목만 변경')
    await expect(page.getByTestId('memo-summary-text')).toHaveText('요약 2')
    expect(calls).toBe(2)
  })

  test('요약 도중 본문을 수정하면 늦게 도착한 이전 응답은 폐기된다', async ({
    page,
  }) => {
    let calls = 0
    let staleDelivered = false
    let release: () => void = () => {}
    const gate = new Promise<void>(resolve => (release = resolve))
    await page.route(SUMMARY_URL, async route => {
      calls += 1
      if (calls === 1) {
        await gate
        await fulfillSummary(route, '오래된 요약')
        staleDelivered = true
        return
      }
      await fulfillSummary(route, '최신 요약')
    })

    await createMemo(page, '경쟁 상태 메모', LONG_CONTENT)
    await editMemo(page, '경쟁 상태 메모', { content: `${LONG_CONTENT} 수정` })
    await expect.poll(() => calls).toBe(2)

    release()
    await expect.poll(() => staleDelivered).toBe(true)
    await page.waitForTimeout(300)

    await openDetail(page, '경쟁 상태 메모')
    await expect(page.getByTestId('memo-summary-text')).toHaveText('최신 요약')
  })

  test('요약은 새로고침 후에도 유지된다', async ({ page }) => {
    await page.route(SUMMARY_URL, route => fulfillSummary(route, '저장된 요약'))

    await createMemo(page, '영속 메모', LONG_CONTENT)
    await openDetail(page, '영속 메모')
    await expect(page.getByTestId('memo-summary-text')).toHaveText(
      '저장된 요약'
    )

    await page.reload()
    await openDetail(page, '영속 메모')
    await expect(page.getByTestId('memo-summary-text')).toHaveText(
      '저장된 요약'
    )
  })
})

test.describe('/api/summarize 입력 검증', () => {
  test('본문이 비어 있으면 400을 반환한다', async ({ request }) => {
    const response = await request.post('/api/summarize', {
      data: { content: '   ' },
    })
    expect(response.status()).toBe(400)
  })

  test('본문이 문자열이 아니면 400을 반환한다', async ({ request }) => {
    const response = await request.post('/api/summarize', {
      data: { content: 123 },
    })
    expect(response.status()).toBe(400)
  })
})
