# Memo App - AI Agent 지침서

## 프로젝트 개요

메모 CRUD 기능을 제공하는 Next.js 웹 애플리케이션. 브라우저 LocalStorage를 사용하여 데이터를 영속화하며, 카테고리 분류 및 검색 기능을 지원한다.

## Tech Stack

- **Framework:** Next.js 16.2.9 (App Router)
- **Language:** TypeScript 5.x (strict mode)
- **UI:** React 19.1.0 + Tailwind CSS 4.x
- **State:** Client-side state (useState, useCallback, useMemo)
- **Markdown:** @uiw/react-md-editor (편집, SSR 비활성화 동적 import) + react-markdown / remark-gfm / rehype-sanitize (렌더링)
- **Persistence:** Browser LocalStorage
- **AI 요약:** Gemini API (기본 `gemini-3.1-flash-lite`), Next.js Route Handler(`/api/summarize`)에서 서버 환경변수(`GEMINI_API_KEY`, 선택 `GEMINI_MODEL`)로 호출
- **Testing:** Playwright (E2E)
- **Linting:** ESLint + Prettier

## Operational Commands

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 린트 검사
npm run lint

# 코드 포맷팅
npm run format

# E2E 테스트 실행
npm run test

# 테스트 (헤드 모드)
npm run test:headed

# 테스트 UI 모드
npm run test:ui
```

## Golden Rules

### Immutable (절대 위반 금지)

1. `'use client'` 지시문이 필요한 컴포넌트에서 반드시 명시할 것
2. LocalStorage 접근 시 SSR 환경 체크 (`typeof window === 'undefined'`) 필수
3. 메모 ID 생성은 uuid v4만 사용
4. TypeScript strict mode 위반 금지
5. 민감 파일(`.env`, `.env.*`(`.env.local` 포함), 이름에 `secret`/`credential`이 포함된 파일, `*.pem`, `*.key`, `.npmrc`, `.aws/`, `.ssh/`)은 읽기·수정 절대 금지. Bash(`cat`, `type`, `Get-Content` 등)나 스크립트를 통한 우회도 금지하며, 필요하면 사용자가 직접 확인하도록 안내할 것 (`.claude/settings.json`의 `permissions.deny`와 동일한 규칙)

### Do's (권장 사항)

- 컴포넌트는 함수형 컴포넌트로 작성
- 상태 변경 함수는 useCallback으로 메모이제이션
- 파생 상태는 useMemo로 계산
- 파일명은 PascalCase (컴포넌트), camelCase (유틸, 훅)
- 한국어 UI 텍스트 사용
- API 키는 서버(Route Handler)에서만 사용하고 클라이언트 코드/`NEXT_PUBLIC_` 변수에 두지 않음 (`.env.local`은 커밋 금지)
- Tailwind 유틸리티 클래스 우선 사용
- 화면(UI)을 변경하는 작업이 끝나면 Playwright MCP로 브라우저를 열어 직접 동작을 확인하고, 확인한 내용(수행한 시나리오와 결과)을 사용자에게 보고

### Don'ts (금지 사항)

- Class 컴포넌트 사용 금지
- any 타입 사용 금지 (불가피한 경우 주석으로 사유 명시)
- 인라인 스타일 지양 (Tailwind 사용)
- console.log를 프로덕션 코드에 남기지 않음 (에러 로깅 제외)
- 외부 상태 관리 라이브러리 도입 금지 (현재 규모에서 불필요)

## 프로젝트 구조

```
src/
├── app/           # Next.js App Router 페이지
├── components/    # React 컴포넌트
├── hooks/         # 커스텀 훅
├── types/         # TypeScript 타입 정의
└── utils/         # 유틸리티 함수
```

## Standards & References

### 코딩 컨벤션

- ESLint: `eslint-config-next` 기반
- Prettier: `.prettierrc` 설정 준수
- Import 순서: React -> 외부 라이브러리 -> 내부 모듈 (`@/` alias 사용)

### Git 전략

- 커밋 메시지: 한국어로 작성
- 브랜치: feature/, fix/, refactor/ 접두사 사용

### Maintenance Policy

규칙과 실제 코드 구현 간 괴리가 발생하면, 코드를 기준으로 이 문서의 업데이트를 제안하라.

## Context Map (Action-Based Routing)

- **[페이지 및 레이아웃 (App Router)](./src/app/AGENTS.md)** — 라우팅, 페이지 컴포넌트, 메타데이터 작업 시
- **[UI 컴포넌트 (Components)](./src/components/AGENTS.md)** — 재사용 가능한 UI 컴포넌트 작성/수정 시
- **[상태 관리 (Hooks)](./src/hooks/AGENTS.md)** — 커스텀 훅 및 상태 로직 작업 시
- **[타입 정의 (Types)](./src/types/AGENTS.md)** — 인터페이스 및 타입 정의 시
- **[유틸리티 (Utils)](./src/utils/AGENTS.md)** — 헬퍼 함수 및 LocalStorage 로직 작업 시
