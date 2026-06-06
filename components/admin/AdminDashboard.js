"use client";

import {
  BarChart,
  LineChart,
  HorizontalBars,
  FeedbackPie,
  StatCard,
} from "@/components/admin/AdminCharts";

export default function AdminDashboard({ dashboard, billing }) {
  if (!dashboard) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-800">
        상세 대시보드를 불러오려면 서버에 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.
      </p>
    );
  }

  const {
    cards,
    charts,
    dwell,
    usagePatterns,
    quality,
    dailyCron,
    dataAssetHealth,
    publicBrandTest,
  } = dashboard;

  return (
    <>
      {publicBrandTest && (
        <section className="mb-6 rounded-xl border border-[#03A94D]/25 bg-[#03C75A]/5 p-4">
          <h2 className="text-[15px] font-bold text-[#191F28]">
            가입 전 브랜드 테스트 (랜딩 샘플)
          </h2>
          <p className="mt-1 text-[12px] text-[#8B95A1]">
            {publicBrandTest.tableReady
              ? publicBrandTest.note
              : "public_test_runs 테이블 없음 — npm run apply:schema-v19-public-test"}
          </p>
          {publicBrandTest.tableReady ? (
            <>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard
                  label="샘플 이용자 (누적)"
                  value={publicBrandTest.totalSampleUsers ?? 0}
                  hint="세션·IP 기준 중복 제거"
                />
                <StatCard
                  label="성공 샘플 (누적)"
                  value={publicBrandTest.totalRuns ?? 0}
                />
                <StatCard
                  label="오늘 성공"
                  value={publicBrandTest.runsToday ?? 0}
                />
                <StatCard
                  label="최근 7일"
                  value={publicBrandTest.runs7d ?? 0}
                />
                <StatCard
                  label="최근 30일"
                  value={publicBrandTest.runs30d ?? 0}
                  hint={
                    publicBrandTest.lastRunAt
                      ? `마지막 ${new Date(publicBrandTest.lastRunAt).toLocaleString("ko-KR", {
                          timeZone: "Asia/Seoul",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : "기록 없음"
                  }
                />
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <BarChart
                  title="일별 샘플 성공 (7일)"
                  points={publicBrandTest.runsPerDay7 || []}
                />
                <HorizontalBars
                  title="인기 테스트 브랜드 (30일)"
                  items={publicBrandTest.topBrands || []}
                  labelKey="label"
                />
              </div>
            </>
          ) : null}
        </section>
      )}

      {dailyCron && (
        <section className="mb-6 rounded-xl border border-[#3182F6]/25 bg-[#3182F6]/5 p-4">
          <h2 className="text-[15px] font-bold text-[#191F28]">일일 개발 루프 (자정 크론)</h2>
          <p className="mt-1 text-[12px] text-[#8B95A1]">
            KST 전일 집계 · 인사이트 후보 생성 ·{" "}
            <code className="text-[11px]">docs/daily-run-latest.md</code>
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="마지막 실행"
              value={
                dailyCron.ranAt
                  ? new Date(dailyCron.ranAt).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"
              }
              hint={`기준일 ${dailyCron.snapshotDate || "—"}`}
            />
            <StatCard
              label="전일 가입"
              value={dailyCron.signups ?? 0}
            />
            <StatCard
              label="전일 생성"
              value={dailyCron.contentItems ?? 0}
            />
            <StatCard
              label="전일 평균 품질"
              value={
                dailyCron.avgQualityScore != null
                  ? `${dailyCron.avgQualityScore}점`
                  : "—"
              }
            />
            <StatCard
              label="브랜드 학습 갱신"
              value={dailyCron.brandsRecomputed ?? 0}
              hint={`인사이트 +${dailyCron.insightsInserted ?? 0}`}
            />
          </div>
        </section>
      )}

      {dataAssetHealth && (
        <section className="mb-6 rounded-xl border border-[#03C75A]/25 bg-[#03C75A]/5 p-4">
          <h2 className="text-[15px] font-bold text-[#191F28]">데이터 자산 건강</h2>
          <p className="mt-1 text-[12px] text-[#8B95A1]">
            브랜드 학습·피드백·스냅샷 성장 (원문·개인 식별 정보 미표시)
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="학습 프로필 브랜드"
              value={dataAssetHealth.brandsWithLearningProfiles ?? "—"}
            />
            <StatCard
              label="피드백 (30일)"
              value={dataAssetHealth.feedbackLast30d ?? "—"}
            />
            <StatCard
              label="자산 롤업 브랜드"
              value={dataAssetHealth.brandsWithAssetRollup ?? 0}
              hint={`생성 누적 ${dataAssetHealth.brandsWithGenerations ?? 0}개 브랜드`}
            />
            <StatCard
              label="레지스트리 이벤트"
              value={dataAssetHealth.registryEventsLast30d ?? 0}
              hint={
                dataAssetHealth.registryByType
                  ? Object.entries(dataAssetHealth.registryByType)
                      .map(([k, v]) => `${k} ${v}`)
                      .join(" · ")
                  : ""
              }
            />
            <StatCard
              label="일일 스냅샷"
              value={dataAssetHealth.snapshotGrowth?.length ?? 0}
              hint="최근 14일 기록 수"
            />
          </div>
        </section>
      )}

      <section>
        <h2 className="text-[16px] font-bold text-[#191F28]">운영 한눈에 보기</h2>
        <p className="mt-1 text-[12px] text-[#8B95A1]">
          최근 30일 기준 집계 · 개인 콘텐츠 원문은 표시하지 않습니다.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="전체 회원" value={cards.totalUsers ?? "—"} />
          <StatCard label="활성 (7일)" value={cards.active7d ?? 0} hint="생성·이벤트 기준" />
          <StatCard label="오늘 생성" value={cards.generationsToday ?? 0} />
          <StatCard label="이번 달 생성" value={cards.generationsMonth ?? 0} />
          <StatCard
            label="평균 품질 (30일)"
            value={cards.avgQualityScore != null ? `${cards.avgQualityScore}점` : "—"}
          />
          <StatCard
            label="피드백 좋음 비율"
            value={
              cards.feedbackTotal
                ? `${cards.feedbackGoodPct ?? 0}%`
                : "—"
            }
            hint={
              cards.feedbackTotal
                ? `전체 ${cards.feedbackTotal}건`
                : "피드백 없음"
            }
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[15px] font-bold">추이 · 차트</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <BarChart title="가입 (최근 7일)" points={charts.signups7} />
          <BarChart title="가입 (최근 30일)" points={charts.signups30} />
          <BarChart title="일별 콘텐츠 생성" points={charts.generationsPerDay} />
          <LineChart title="일별 평균 품질 점수" points={charts.qualityTrend} />
          <FeedbackPie title="피드백 반응" items={charts.feedbackBreakdown} />
          <HorizontalBars
            title="생성 실패 사유 TOP"
            items={(charts.topFailReasons || []).map((e) => ({
              label: e.reason,
              count: e.count,
            }))}
            labelKey="label"
          />
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-[#E8EBED] bg-white p-4">
        <h2 className="text-[15px] font-bold">체류 · 사용 강도</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <StatCard
            label="평균 세션(추정)"
            value={
              dwell.avgSessionMinutes != null
                ? `${dwell.avgSessionMinutes}분`
                : "—"
            }
            hint={
              dwell.hasSessionDuration
                ? "session_duration 로그"
                : "이벤트 간격 프록시"
            }
          />
          <StatCard
            label="일 평균 이벤트/사용자"
            value={dwell.avgEventsPerUserDay ?? 0}
          />
          <StatCard
            label="표본 (사용자·일)"
            value={dwell.userDaySamples ?? 0}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[15px] font-bold">사용 패턴 (익명 집계)</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <HorizontalBars
            title="인기 화자/페르소나"
            items={usagePatterns.topPersonas}
            labelKey="label"
          />
          <HorizontalBars
            title="채널 사용"
            items={usagePatterns.channelUsage.map((c) => ({
              label: channelLabel(c.key),
              count: c.count,
            }))}
          />
          <HorizontalBars
            title="요금제 분포"
            items={usagePatterns.planDistribution}
            labelKey="label"
          />
          <HorizontalBars
            title="업종 힌트 TOP"
            items={usagePatterns.topIndustries.map((c) => ({
              label: c.key,
              count: c.count,
            }))}
          />
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-[#03C75A]/30 bg-[#03C75A]/5 p-4">
        <h2 className="text-[15px] font-bold text-[#191F28]">품질 개선</h2>
        <ul className="mt-2 space-y-1 text-[12px] text-[#4E5968]">
          <li>
            30일 평균 품질:{" "}
            <strong>{quality.avgQualityScore30d ?? "—"}점</strong>
          </li>
          <li>
            승인 대기 인사이트:{" "}
            <strong>{quality.pendingInsightsCount ?? 0}건</strong> (아래에서
            승인 시 전역 규칙 반영)
          </li>
          <li>자동 품질 테스트·진화 랩은 페이지 하단 패널에서 실행</li>
        </ul>
        {billing && (
          <p className="mt-3 text-[11px] text-[#8B95A1]">
            구독 — Free {billing.subscriptionsFree ?? "—"} · Brand{" "}
            {billing.subscriptionsBrand ?? "—"} · Studio{" "}
            {billing.subscriptionsStudio ?? "—"}
          </p>
        )}
      </section>
    </>
  );
}

function channelLabel(key) {
  const map = {
    blog: "블로그",
    place: "플레이스",
    smartplace: "스마트플레이스",
    instagram: "인스타",
    insta: "인스타",
    image: "이미지",
  };
  return map[key] || key || "기타";
}
