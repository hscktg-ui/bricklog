import {
  formatBlogFullCopy,
  formatPlaceFullCopy,
  formatInstaFullCopy,
  formatImageFullCopy,
} from "@/utils/copyFormatter";
import {
  checkBlogQuality,
  checkPlaceQuality,
  checkInstaQuality,
  buildVerificationReport,
} from "@/utils/qualityCheck";
import { countBlogBodyChars } from "@/lib/prompts/engine/textUtils";
import { runFactCheck, applyFactCheckFixes } from "@/lib/research/factCheck";
import { scrubGptToneDeep } from "@/utils/gptToneScrubber";
import { stripSourceCitations } from "@/lib/research/reinterpret";
import {
  buildLocationIntel,
  formatLocationBlock,
  naturalLocationLine,
} from "@/lib/location/locationIntelligence";

import {
  applyBlogPackIntegrity,
  validateBlogPackIntegrity,
} from "@/lib/integrity/templateIntegrity";
import { attachEditorAI } from "@/lib/editorAI";
import {
  sanitizePlacePack,
  sanitizeInstaPack,
} from "@/lib/integrity/channelTextSanitizer";
import { applyConstitutionV2ToChannelPack } from "@/lib/constitution/writingConstitutionV2";

export function enrichBlogPack(pack, ctx, input) {
  if (!pack) return pack;
  let next = applyBlogPackIntegrity({ ...pack }, {
    region: ctx.region,
    brandName: ctx.brandName,
    main: ctx.main,
    industryLabel: ctx.industryLabel,
  });
  next.representativeTitle = stripSourceCitations(
    scrubGptToneDeep(next.representativeTitle || next.title)
  );
  next.sections = (next.sections || []).map((s) => ({
    heading: scrubGptToneDeep(s.heading),
    body: scrubGptToneDeep(s.body),
  }));
  next.conclusion = scrubGptToneDeep(next.conclusion);
  const fullText = [
    ...(next.sections || []).map((s) => s.body),
    next.conclusion,
  ].join("\n");

  const factCheck = runFactCheck(fullText, input);
  if (!factCheck.pass) {
    next.sections = (next.sections || []).map((s) => ({
      ...s,
      body: applyFactCheckFixes(s.body, factCheck),
    }));
    next.conclusion = applyFactCheckFixes(next.conclusion, factCheck);
  }

  const locationIntel = buildLocationIntel(input);
  const locLine = naturalLocationLine(locationIntel);
  if (
    locLine &&
    input.includeAddress &&
    input.address?.trim() &&
    next.sections?.length
  ) {
    const first = next.sections[0];
    if (!first.body?.includes(locLine.slice(0, 8))) {
      next.sections = [
        { ...first, body: `${first.body}\n\n${locLine}` },
        ...next.sections.slice(1),
      ];
    }
  }
  if (input.locationBlock) {
    const block = formatLocationBlock(locationIntel, {
      address: input.includeAddress,
      phone: input.includePhone,
      hours: input.includeHours,
      parking: input.includeParking,
    });
    if (block) {
      next.conclusion = next.conclusion
        ? `${next.conclusion}\n\n${block}`
        : block;
    }
  }
  next._meta = { ...next._meta, locationIntel };

  next.fullCopyText = formatBlogFullCopy(next, {
    includeSubheadings: next._meta?.includeSubheadings !== false,
  });
  const quality = checkBlogQuality(next, ctx);
  next.qualityReport = {
    ...quality,
    factCheck,
    verification: buildVerificationReport({
      channel: "blog",
      quality,
      factCheck,
      brandResearch: ctx.brandResearch,
    }),
  };
  const integrity = validateBlogPackIntegrity(next, {
    region: ctx.region,
    brandName: ctx.brandName,
    main: ctx.main,
    industryLabel: ctx.industryLabel,
  });

  next._meta = {
    ...next._meta,
    charCount: countBlogBodyChars(next),
    quality,
    qualityReport: next.qualityReport,
    factCheck,
    templateIntegrity: integrity,
  };
  return attachEditorAI("blog", next, {
    ...ctx,
    contentDate: input?.contentDate,
  });
}

export function enrichPlacePack(pack, ctx, input) {
  if (!pack) return pack;
  let next = sanitizePlacePack(
    {
      ...pack,
      title: scrubGptToneDeep(pack.title || ""),
      shortNotice: scrubGptToneDeep(pack.shortNotice || pack.shortBody || ""),
      shortBody: scrubGptToneDeep(pack.shortBody || pack.shortNotice || ""),
      detailBody: scrubGptToneDeep(pack.detailBody || ""),
      cta: scrubGptToneDeep(pack.cta || ""),
    },
    { region: ctx.region, brandName: ctx.brandName }
  );
  const text = [next.title, next.shortBody, next.detailBody, next.cta].join("\n");
  const factCheck = runFactCheck(text, input);
  next.fullCopyText = formatPlaceFullCopy(next);
  const quality = checkPlaceQuality(next, ctx);
  next.qualityReport = {
    ...quality,
    factCheck,
    verification: buildVerificationReport({
      channel: "place",
      quality,
      factCheck,
      brandResearch: ctx.brandResearch,
    }),
  };
  next = applyConstitutionV2ToChannelPack(next, "place");
  next._meta = { ...next._meta, quality, qualityReport: next.qualityReport };
  return attachEditorAI("place", next, ctx);
}

export function enrichInstaPack(pack, ctx, input) {
  if (!pack) return pack;
  let next = sanitizeInstaPack(
    {
      ...pack,
      hook: scrubGptToneDeep(pack.hook || ""),
      body: scrubGptToneDeep(pack.body || ""),
      ending: scrubGptToneDeep(pack.ending || ""),
      lineBreakBody: scrubGptToneDeep(pack.lineBreakBody || pack.body || ""),
    },
    { region: ctx.region, brandName: ctx.brandName }
  );
  const factCheck = runFactCheck(
    [next.hook, next.body, next.ending].join("\n"),
    input
  );
  next.fullCopyText = formatInstaFullCopy(next);
  const quality = checkInstaQuality(next, ctx);
  next.qualityReport = {
    ...quality,
    factCheck,
    verification: buildVerificationReport({
      channel: "instagram",
      quality,
      factCheck,
      brandResearch: ctx.brandResearch,
    }),
  };
  next = applyConstitutionV2ToChannelPack(next, "instagram");
  next._meta = { ...next._meta, quality, qualityReport: next.qualityReport };
  return attachEditorAI("instagram", next, ctx);
}

export function enrichImagePack(pack, ctx) {
  if (!pack) return pack;
  const base = {
    ...pack,
    fullCopyText: formatImageFullCopy(pack),
    _meta: {
      ...pack._meta,
      channel: "image",
      mockOutput: true,
    },
  };
  return attachEditorAI("image", base, ctx);
}
