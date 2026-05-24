# BRICLOG 일일 개발 루프 (자정 크론)

매일 **한국 시간 00:00**에 전일 사용 데이터를 집계하고, 엔진 개선용 학습·인사이트 후보를 갱신합니다. 규칙은 **자동 적용되지 않으며** `/admin`에서 승인 후 반영합니다.

## 엔드포인트

### 자정 — 전일 집계 + 엔진 학습

```http
POST /api/cron/daily-develop
Authorization: Bearer <CRON_SECRET>
```

### 정오 (12:00 KST) — 당일 부분 피드백

```http
POST /api/cron/daily-digest
Authorization: Bearer <CRON_SECRET>
```

- `vercel.json`: `0 3 * * *` (UTC) = **12:00 KST**
- 결과: `docs/daily-digest-noon.md` (가입·생성·피드백·프로필 저장 건수)

환경 변수 (하나 이상 설정):

| 변수 | 설명 |
|------|------|
| `BRICLOG_CRON_SECRET` | 권장 (일일 루프 전용) |
| `CRON_SECRET` | 트렌드 수집과 공유 가능 |
| `TREND_COLLECT_SECRET` | 레거시 호환 |

미설정 시 **503** `cron_secret_not_configured`.

### 쿼리

| 파라미터 | 설명 |
|----------|------|
| `date=YYYY-MM-DD` | KST 기준 집계일 (기본: **어제**) |
| `force=1` | 동일 날짜 스냅샷이 있어도 재실행 |

## 파이프라인 단계

1. **전일(KST) 사용량 집계** — `profiles`, `content_items`, `content_events`, `content_feedback`, `content_performance`, 요금제 분포
2. **스냅샷 저장** — Supabase `daily_usage_snapshots` + 로컬 `.data/daily-runs/YYYY-MM-DD.json`
3. **브랜드 학습** — 최근 7일 활동 브랜드 `brand_learning_profiles` 재계산 (최대 80건)
4. **데이터 자산 복리** — `brands.brand_data_assets` 롤업 + `data_asset_registry` (v12, `compoundDataAssetsNightly`)
5. **전역 인사이트 후보** — `global_quality_insights` pending 추가 (중복 타입 스킵)
6. **운영 요약** — `docs/daily-run-latest.md` 갱신 (PII·원문 없음)

동일 `snapshot_date`는 **멱등**: 두 번째 호출은 DB 스냅샷을 재사용합니다 (`force=1` 제외).

## DB 마이그레이션

Supabase SQL Editor에서 실행:

```
supabase/schema-v10-daily-cron.sql
supabase/schema-v12-data-assets.sql
```

자산 플라이휠 상세: `docs/DATA_ASSET_STRATEGY.md`

## 스케줄 (00:00 KST)

Vercel Cron은 **UTC** 기준입니다. KST 00:00 = **전날 UTC 15:00**.

### Vercel (`vercel.json`)

이미 포함된 경우:

```json
{
  "path": "/api/cron/daily-develop",
  "schedule": "0 15 * * *"
}
```

배포 환경에 `BRICLOG_CRON_SECRET` 또는 `CRON_SECRET` 설정.

### Windows 작업 스케줄러

1. 작업 만들기 → 매일 **00:00** (표준 시간대: `(UTC+09:00) 서울`)
2. 동작: 프로그램 시작

```powershell
curl.exe -X POST -H "Authorization: Bearer %BRICLOG_CRON_SECRET%" https://YOUR_DOMAIN/api/cron/daily-develop
```

### Linux / macOS cron

```cron
0 0 * * * TZ=Asia/Seoul curl -sS -X POST -H "Authorization: Bearer $BRICLOG_CRON_SECRET" https://YOUR_DOMAIN/api/cron/daily-develop
```

### 로컬 개발

```bash
# .env.local 에 CRON_SECRET=dev
npm run dev
# 다른 터미널
npm run daily:develop
```

## 응답 예시

```json
{
  "ok": true,
  "idempotent": false,
  "snapshotDate": "2026-05-21",
  "signups": 3,
  "contentItems": 42,
  "brandsRecomputed": 12,
  "insightsInserted": 1
}
```

## 보안

- Bearer 시크릿 필수
- 공개 JSON/문서에 이메일·콘텐츠 원문 미포함
- 인사이트 승인은 기존 `/api/admin/insights/approve` 흐름 유지

## 관련 문서

- 운영 요약: `docs/daily-run-latest.md`
- 아침 점검: `docs/MORNING_CHECKLIST.md`
