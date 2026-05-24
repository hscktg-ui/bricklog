# 4인 가상 유저 — 개인화·작업실 검증

`npm run test:users` 로 재현 (4/4 통과).

## 가상 유저

| ID | 유형 | 프로필 특성 | 브랜드 |
|----|------|-------------|--------|
| vu_agency_01 | 광고대행 | 다브랜드·담백·이모지↓ | 모닝브루 강남 |
| vu_cafe_owner | 카페 사장 | 단일·감성·짧은 문장 | 골목로스터리 |
| vu_clinic_dir | 의료 원장 | 플레이스 우선·과장 금지 | 연세정형외과 |
| vu_creator_01 | MD/인스타 | 캡션·로컬 해시 | 꽃담 |

## 반영 계층 (프롬프트)

1. **접속·가입 프로필** → `personalizationBriefFromProfile` (운영자 맥락)
2. **계정 습관** → `user_writing_profiles` / `formatUserWritingBrief`
3. **브랜드 고유** → `formatBrandHabitsBrief` + 피드백 학습 브리프
4. **합성** → `buildCombinedPersonalizationAddon` → 블로그 API·검수 개선 LLM

## 호환 수정

- `GrowthStudio` · `BrandDraftHistoryStrip`: memory + `contentArchive` **병합** (`mergeDraftHistoryItems`)
- 아카이브 항목에 `versionSource` 라벨 (검수 원문/개선/보완)
- 붙여넣기 검수 API: `brandId` 시 개인화 블록 주입
- `applyPersonalizationToContext`: `accountBrief` 누락 보완
