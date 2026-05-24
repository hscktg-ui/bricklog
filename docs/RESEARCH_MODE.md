# Research Mode (자료조사)

## 사용 방법

1. **이야기(블로그)** 작업 화면 왼쪽 폼에서 **「자료조사 사용」** 체크
2. 조사 유형 선택 (복수 가능)
3. **연구 주제** 입력 (예: 판교 꽃집 소비 트렌드)
4. **이야기 쓰기** 클릭

### 파이프라인

- **ON:** 자료조사 → 요약 → Brand Memory 반영 → 콘텐츠 생성
- **OFF:** 기존과 동일

결과 영역 상단에 **[조사결과]** 카드, 아래에 최종 블로그 본문이 표시됩니다.

## DB 마이그레이션

Supabase SQL Editor에서 실행:

`supabase/schema-v10-research.sql`

컬럼: `research_query`, `research_result`, `research_date`, `research_source` on `content_items`

마이그레이션 전에도 생성·조사는 동작하며, 상세 DB 저장만 생략됩니다.

## API

- `POST /api/content/research` — 조사만 실행 (인증 필요)
- 블로그 생성 시 `researchEnabled` + `researchQuery` 가 있으면 클라이언트가 자동으로 조사 후 `/api/content/blog` 호출

## 제한 사항

- **실시간 웹 검색 API는 기본 미연결**입니다. OpenAI가 주제·브랜드 맥락 기반으로 조사 초안을 작성합니다.
- 출처 URL은 검증되지 않을 수 있으니 발행 전 fact-check가 필요합니다.
- OpenAI 미설정 시 간단 오프라인 초안만 제공됩니다.

## 향후 (Brand Memory)

`lib/memory/brandMemoryBundle.js` 의 `buildResearchMemoryAddon()` 으로 조사 이력을 브랜드 메모리에 연결할 수 있도록 구조만 준비되어 있습니다.
