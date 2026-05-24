"use client";

import { useMemo } from "react";
import { getWritingContextHints } from "@/lib/inspiration/topicScopedInspiration";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

/** 주제 입력 디바운스 후 작성 맥락 힌트 팩 */
export function useWritingContextHints({
  contentDate,
  industryKey = "",
  brandName = "",
  topic = "",
  mainKeyword = "",
  subKeyword = "",
  includePhrases = "",
  channel = "blog",
  debounceMs = 320,
}) {
  const debouncedTopic = useDebouncedValue(topic, debounceMs);
  const debouncedKeyword = useDebouncedValue(mainKeyword, debounceMs);
  const debouncedSubKeyword = useDebouncedValue(subKeyword, debounceMs);
  const debouncedInclude = useDebouncedValue(includePhrases, debounceMs);

  const pack = useMemo(
    () =>
      getWritingContextHints({
        channel,
        date: contentDate,
        industryKey,
        brandName,
        topic: debouncedTopic,
        mainKeyword: debouncedKeyword,
        subKeyword: debouncedSubKeyword,
        includePhrases: debouncedInclude,
      }),
    [
      channel,
      contentDate,
      industryKey,
      brandName,
      debouncedTopic,
      debouncedKeyword,
      debouncedSubKeyword,
      debouncedInclude,
    ]
  );

  return pack;
}
