# 톤·성격 반영 엔진 (사용자 관점)

브릭로그는 사용자별 fine-tuning 모델이 아니라 **프롬프트 주입 + 송출 후처리 4층**으로 말투·성격을 맞춥니다.

## 4층 구조

| 층 | 역할 | 주요 모듈 |
|----|------|-----------|
| ① 화자·성격 | 칼럼니스트 archetype, 1인칭·관찰 각도 | `personaEngineProfile.js`, `speakerVoiceLock.js`, `v4Speakers` |
| ② 말투·톤 | 존댓말/담백/프리미엄, 감정 온도 | `writingConstitutionV2.js` (`speechStyle`), 브랜드 `tone` |
| ③ 브랜드 습관 | 반복 표현·선호 문장 (로컬 메모리) | `brandHabits.js`, `learnFromEdit` |
| ④ 학습·피드백 | 2회차 생성부터 프로필 반영 | `brand_learning_profiles`, `prepareBrandFirstInput` |

## UI ↔ 엔진

- 생성기 **화자 선택** → `applyV4SpeakerToInput` → Writer 프롬프트 + `applySpeakerVoiceLockPack`
- **BrandHabitStrip** → ③ 학습된 한 줄 요약 (2편째 생성·피드백 이후)
- 운영 기획 **2026–2027 플랫폼 전략** → `platformTrends2026.js` (채널·AuthGR·AI Briefing)

## 첫 글 vs 5편째

| 시점 | 반영 |
|------|------|
| 첫 글 | ①② 화자·말투 + 브랜드 입력만 |
| 2편째~ | ③④ 습관·피드백 프로필이 `buildBrandMemoryUserSection`에 합류 |

## 측정

- `humanVoiceMet` — `humanColumnContract.js` (경험·belief·AI 패턴)
- `trainingPass` — `scorer.js` (publishReady SSOT와 정렬)
