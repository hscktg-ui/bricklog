"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import {
  getGreetingByIndex,
  LANDING_GREETINGS_PUBLIC,
} from "@/lib/landing/greetings";
import {
  getContentIdeaByIndex,
  LANDING_CONTENT_IDEAS,
} from "@/lib/landing/contentIdeas";
import {
  getLandingSampleByIndex,
  LANDING_SAMPLE_SETS,
} from "@/lib/landing/sampleContent";
import { getSeasonCopy } from "@/lib/landing/seasonCopy";
import {
  DEFAULT_SEASON_THEME,
  getKoreaSeason,
  getSeasonTheme,
} from "@/lib/landing/seasonTheme";
import {
  pickSessionIndex,
  recordLandingVisit,
  STORAGE_GREETING,
  STORAGE_IDEA,
  STORAGE_SAMPLE,
} from "@/lib/landing/landingSession";

const DEFAULT_GREETING = getGreetingByIndex(0);
const DEFAULT_SAMPLE = getLandingSampleByIndex(0);
const DEFAULT_IDEA = getContentIdeaByIndex(0);

/**
 * 랜딩 방문별 인사·샘플·아이디어 순환 + 당일 계절 테마·카피
 * SSR/첫 페인트는 기본값, 마운트 후 sessionStorage·날짜 반영
 */
export function useLandingVisit() {
  const [greetingIdx, setGreetingIdx] = useState(0);
  const [sampleIdx, setSampleIdx] = useState(0);
  const [ideaIdx, setIdeaIdx] = useState(0);
  const [seasonKey, setSeasonKey] = useState("winter");
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    recordLandingVisit();
    setSeasonKey(getKoreaSeason(new Date()));
    setGreetingIdx(
      pickSessionIndex(STORAGE_GREETING, LANDING_GREETINGS_PUBLIC.length)
    );
    setSampleIdx(
      pickSessionIndex(STORAGE_SAMPLE, LANDING_SAMPLE_SETS.length)
    );
    setIdeaIdx(
      pickSessionIndex(STORAGE_IDEA, LANDING_CONTENT_IDEAS.length)
    );
    setReady(true);
  }, []);

  const greeting = useMemo(
    () => (ready ? getGreetingByIndex(greetingIdx) : DEFAULT_GREETING),
    [ready, greetingIdx]
  );
  const sample = useMemo(
    () => (ready ? getLandingSampleByIndex(sampleIdx) : DEFAULT_SAMPLE),
    [ready, sampleIdx]
  );
  const contentIdea = useMemo(
    () => (ready ? getContentIdeaByIndex(ideaIdx) : DEFAULT_IDEA),
    [ready, ideaIdx]
  );
  const seasonCopy = useMemo(() => getSeasonCopy(seasonKey), [seasonKey]);
  const theme = useMemo(
    () => (ready ? getSeasonTheme(seasonKey) : DEFAULT_SEASON_THEME),
    [ready, seasonKey]
  );

  return {
    ready,
    greeting,
    sample,
    contentIdea,
    seasonCopy,
    theme,
    seasonKey,
  };
}
