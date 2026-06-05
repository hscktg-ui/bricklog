/**
 * STEP 6 — 구조 다양성 게이트 (v6.2)
 * 최근 콘텐츠와 구조 유사도 70% 이상이면 다른 구조를 요구한다.
 */
import {
  checkRecentStructureSimilarity,
  extractStructureSignature,
} from "@/lib/duplicate/contentSimilarity";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";

export const STRUCTURE_VARIETY_THRESHOLD = 70;
export const STRUCTURE_ARCHIVE_LIMIT = 30;

export function buildStructureArchivesFromItems(items = []) {
  return items.slice(0, STRUCTURE_ARCHIVE_LIMIT).map((item) => ({
    at: item.created_at || item.updated_at,
    signature: extractStructureSignature({
      title: item.title,
      sections: parseSectionsFromItem(item),
    }),
  }));
}

function parseSectionsFromItem(item = {}) {
  const raw = item.full_content || item.content || "";
  if (Array.isArray(item.sections)) return item.sections;
  if (!raw) return [];
  const sections = [];
  const blocks = String(raw).split(/\n{2,}/);
  for (const block of blocks) {
    const m = block.match(/^#{1,3}\s*(.+)\n([\s\S]*)$/);
    if (m) sections.push({ heading: m[1].trim(), body: m[2].trim() });
  }
  return sections;
}

export function assessStructureVariety(pack, input = {}) {
  if (!isBriclogMissionEnforced()) {
    return { ok: true, skipped: true };
  }

  const archives =
    input.recentStructureArchives ||
    buildStructureArchivesFromItems(input.approvedContentItems || []);

  const check = checkRecentStructureSimilarity(pack, archives, {
    threshold: STRUCTURE_VARIETY_THRESHOLD,
  });

  const altStructure = input.contentStructureType || "칼럼형";
  return {
    ok: !check.isHigh,
    ...check,
    alternateStructureHint: check.isHigh
      ? `직전 글과 구조가 ${check.percent}% 유사 — ${altStructure} 또는 다른 리듬으로 재구성할 것`
      : null,
  };
}

export function buildStructureVarietyBrief(input = {}) {
  const archives = input.recentStructureArchives?.length || 0;
  const structure = input.contentStructureType || "정보형";
  return [
    "【구조 다양성 v6.2】",
    `권장 구조: ${structure} — 기승전결·동일 소제목 패턴 고정 금지`,
    archives > 0
      ? `최근 ${archives}개 글과 섹션 제목·순서 유사 70%↑ 금지 — 다른 리듬으로 작성`
      : "동일 브랜드 연속 글도 매번 다른 섹션 리듬·제목 패턴 사용",
  ].join("\n");
}

/**
 * @param {object} pack
 * @param {object} input
 */
export function applyStructureVarietyGate(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const assessment = assessStructureVariety(pack, input);
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      structureVariety: assessment,
      structureVarietyOk: assessment.ok !== false,
    },
  };
}
