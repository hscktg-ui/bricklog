# 베타 전 UI 반응성 점검 체크리스트

## 자동/코드로 막은 항목 (2026-05-22)

- 폼 컨텍스트 분리 (`useContentForm` / `useContentPipelineState`)
- 텍스트 입력 220ms 버퍼 (`BlogForm`, 플레이스/인스타, 이미지 주제)
- `validateForm`·`formReady` 지연 (`useDeferredValue`)
- 초안 저장 400ms 디바운스
- 브랜드 검색 로컬 필터 (전역 context 갱신 제거)
- 녹색 CTA 클릭 후 48ms UI 양보 + `startTransition`
- 생성 오버레이·어시스턴트 별도 구독 컴포넌트
- `setFormErrors` 런타임 오류 제거

## 베타 테스터가 꼭 눌러볼 것 (1분)

1. **로그인 → 블로그** — 브랜드명·업종·**지역**·주제 연속 타이핑 (끊김 없어야 함)
2. **브랜드 창고** — 목록 열기·다른 브랜드 선택·검색
3. **이야기 쓰기** (녹색) — 클릭 직후 로딩 표시, 멈춤처럼 보이지 않는지
4. **메뉴** — 플레이스·인스타·프롬프트 전환
5. **결과 편집** — 플레이스 본문 수정 시 타이핑

## 아직 무거울 수 있음 (P2)

- 채널 메뉴 전환 시 화면 통째 마운트
- 결과 패널 인라인 편집 (`EditablePlaceView` 등) 즉시 context 반영
- `BlogEditor` 폼 열에서 TIP 패널·녹색 버튼 같은 트리 리렌더

## 장애 시

- 빨간 화면 `ContentFormContext` → dev 서버 재시작
- 느린 건 네트워크(LLM)와 UI 렉 구분 — 타이핑만 느리면 이 문서 P2
