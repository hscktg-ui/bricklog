# BRICLOG 디자인·운영 점검 (Jobs 렌즈)

**갱신:** 2026-05-22 · **상태:** 1차 전영역 반영 완료

**기준:** 첫 10초 이해 · 한 화면 한 목적 · 덜 꾸민 UI · 손가락 하나로 끝

---

## 평가 요약 (반영 후)

| 영역 | 점수 | 상태 |
|------|------|------|
| 첫 인트로 | **88** | 세션 1회 · 건너뛰기 · 탭 시작 · 진행 점 · 슬로건 중복 제거 |
| 랜딩 | **82** | 히어로 정리 · OG · 푸터 문의 · 요금 결제일 안내 · 통계 타이밍 |
| 워크스페이스 | **80** | 헤더 통일 · 채널 시작 카드 · 로딩 경량 |
| 운영 문서 | **85** | OPERATIONS_RUNBOOK · README · env · 크론 |

---

## 제품 원칙 (고정)

1. **한 화면 CTA 하나** — 나머지는 보조 링크  
2. **같은 문장 두 번 금지** — 슬로건·90점·「시작」류  
3. **품질 90점은 내부만** — 고객은 발행 전 확인 + 피드백 루프  
4. **선보다 여백** — `briclog-surface` · 얇은 헤더  
5. **모바일 = 축약판** — draft.txt 제목 · 2줄 인트로  

---

## 반영 목록 (코드·문서)

### 인트로·랜딩
- [x] 브랜드 2줄만 (슬로건 중복 제거)
- [x] 메모 1~4줄 타자음 · 통계는 인트로 후 in-view 롤링
- [x] 지금 시작하기 pill · 화면 탭 시작
- [x] 인트로 **세션당 1회** + 건너뛰기
- [x] openGraph · robots.txt · sitemap.xml
- [x] 푸터 고객 문의 mailto
- [x] 전역 에러 한국어 (기술 메시지 숨김)

### 워크스페이스·결제
- [x] `briclog-workspace-header`
- [x] 채널 시작 `briclog-surface`
- [x] 생성 로딩 가벼운 딤
- [x] 피드백 저장 실패 메시지 정리
- [x] 랜딩 요금 「매월 결제일」 문구

### 운영·CI
- [x] [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md)
- [x] [README.md](../README.md) 베타 배포 10줄
- [x] `.env.example` — `BRICLOG_CRON_SECRET` · `NEXT_PUBLIC_BRICLOG_CONTACT_EMAIL`
- [x] `test:director` brand 4채널 반영

---

## 남은 P2 (기능 확장 최소)

- [ ] 생성 중 **취소** 버튼
- [ ] SMS 미설정 시 가입 경로 배너
- [ ] 주요 모달 포커스 트랩 a11y 1회 점검
- [ ] `QualityScorePanel.jsx` orphan 제거 (정리만)

---

## 문서 맵

| 문서 | 용도 |
|------|------|
| [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) | **운영 전체** |
| [FINAL_LAUNCH_CHECKLIST.md](./FINAL_LAUNCH_CHECKLIST.md) | 출시 게이트 |
| [DESIGN_JOBS_AUDIT.md](./DESIGN_JOBS_AUDIT.md) | UX 원칙 (이 파일) |
