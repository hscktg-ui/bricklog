/**
 * GPT가 쓴 맛보기 카피. 폴백 하드코딩을 덮는다.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function directedSamplePath(id) {
  return join(process.cwd(), "lib", "product", "directed", `${id}.json`);
}

export function loadDirectedDetailSample(id) {
  const file = directedSamplePath(id);
  if (!existsSync(file)) return null;
  try {
    const data = JSON.parse(readFileSync(file, "utf8"));
    if (!Array.isArray(data?.sections) || data.sections.length < 6) return null;
    return data;
  } catch {
    return null;
  }
}

export function applyDirectedSample(pack, directed) {
  if (!pack || !directed?.sections?.length) return pack;
  const byType = Object.fromEntries(
    directed.sections.filter((s) => s?.type).map((s) => [s.type, s])
  );
  return {
    ...pack,
    sections: (pack.sections || []).map((s) => {
      const next = byType[s.type];
      if (!next) return s;
      return {
        ...s,
        kicker: next.kicker ?? s.kicker,
        title: next.title || s.title,
        body: next.body || s.body,
        rows: next.rows?.length ? next.rows : s.rows,
        bullets: next.bullets?.length ? next.bullets : s.bullets,
        composition: next.composition || s.composition,
      };
    }),
    _meta: {
      ...(pack._meta || {}),
      mode: "directed",
      director: {
        gpt: true,
        grok: directed.grok === true,
        source: directed.id || "directed-sample",
      },
    },
  };
}
