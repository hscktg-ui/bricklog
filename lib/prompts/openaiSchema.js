/**
 * OpenAI 연동 — JSON ONLY 응답 스키마
 */
export function getOpenAIResponseSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      blog: {
        type: "object",
        additionalProperties: false,
        properties: {
          titles: {
            type: "array",
            items: { type: "string" },
            minItems: 5,
            maxItems: 5,
          },
          title: { type: "string" },
          representativeTitle: { type: "string" },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                heading: { type: "string" },
                body: { type: "string" },
              },
              required: ["heading", "body"],
              additionalProperties: false,
            },
            minItems: 5,
          },
          conclusion: { type: "string" },
          hashtags: {
            type: "array",
            items: { type: "string" },
            minItems: 10,
            maxItems: 25,
          },
        },
        required: [
          "titles",
          "title",
          "representativeTitle",
          "sections",
          "conclusion",
          "hashtags",
        ],
      },
      smartplace: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          shortBody: { type: "string" },
          detailBody: { type: "string" },
          cta: { type: "string" },
          hashtags: { type: "array", items: { type: "string" } },
        },
        required: ["title", "shortBody", "detailBody", "cta", "hashtags"],
      },
      insta: {
        type: "object",
        additionalProperties: false,
        properties: {
          hook: { type: "string" },
          body: { type: "string" },
          lineBreakBody: { type: "string" },
          ending: { type: "string" },
          hashtags: { type: "array", items: { type: "string" } },
        },
        required: ["hook", "body", "lineBreakBody", "ending", "hashtags"],
      },
      hashtag: {
        type: "object",
        additionalProperties: false,
        properties: {
          localTags: { type: "array", items: { type: "string" } },
          brandTags: { type: "array", items: { type: "string" } },
          seoTags: { type: "array", items: { type: "string" } },
          trendTags: { type: "array", items: { type: "string" } },
          seasonalTags: { type: "array", items: { type: "string" } },
        },
        required: [
          "localTags",
          "brandTags",
          "seoTags",
          "trendTags",
          "seasonalTags",
        ],
      },
      imagePrompt: {
        type: "object",
        additionalProperties: false,
        properties: {
          thumbnailPrompt: { type: "string" },
          placeImagePrompt: { type: "string" },
          instagramCardPrompt: { type: "string" },
          bannerPrompt: { type: "string" },
        },
        required: [
          "thumbnailPrompt",
          "placeImagePrompt",
          "instagramCardPrompt",
          "bannerPrompt",
        ],
      },
    },
    required: ["blog", "smartplace", "insta", "hashtag", "imagePrompt"],
  };
}

export function getOpenAISystemPrompt(ctx) {
  const userExclude = ctx.excludeList?.length
    ? ctx.excludeList.join(", ")
    : ctx.excludePhrases || "none";
  const forbidden =
    ctx.flavor.forbidden?.length > 0
      ? `${ctx.flavor.forbidden.join(", ")}, ${userExclude}`
      : userExclude;

  return `You are BRICLOG — Korean local content operations system (not a generic GPT wrapper).
Brand: "블로그를 쓰다, 브랜드를 키우다"
Matrix: ${ctx.matrixSummary}

OUTPUT: Return ONLY one valid JSON object matching the schema. No markdown, no code fences, no explanation, no preamble, no trailing text.

GLOBAL:
- Language: Korean for all text fields except imagePrompt fields (English).
- Write like a real Korean Naver blog post by a local business operator — NOT AI summary tone.
- Korean spacing/grammar: standard 띄어쓰기, 조사 붙임, avoid 되요→돼요, 수있→수 있, 것같→것 같.
- NEVER output the strings "undefined", "null", or placeholder labels in any field.
- If a field has no input, omit that idea from prose — do not invent "브랜드", "지역", "업종" as visible words.
- Minimize ad hype; no "최고", "1등", "무조건" unless user allows.
- STRICT EXCLUDE WORDS (must not appear anywhere): ${forbidden}
- Region: ${ctx.region} | Main keyword: ${ctx.main} | Brand: ${ctx.brandName || "(omit brand name if unknown)"}
- Industry: ${ctx.industryLabel} | Purpose: ${ctx.purpose.label} | Tone: ${ctx.tone.label}
- Include points: ${ctx.includePhrases || "none"}

BRAND RESEARCH (reinterpret only — never copy sources; never cite "search results"):
${ctx.searchSummaryBrief || "user input only"}
User input overrides conflicting search inference.
Do NOT output example brand names unless in user Brand field.

CONTENT KPI: ${ctx.kpi?.label || "저장유도형"} — ${ctx.kpi?.hint || ""}
${ctx.industryDNA || ""}
Platform: ${ctx.exposureBlog || ""}
Prompt layers (use, do not dump): ${ctx.promptBrief?.slice(0, 800) || ""}

BLOG (scene → experience → brand, NOT SEO list):
${ctx.channelBriefs.blog}
- Start from a real life scene (commute, rain, sudden gift, etc.), then experience, then brand connection.
- representativeTitle + title: same best title.
- titles: exactly 5 options.
- sections: 5-7 items; each body 250-400 chars; mobile-friendly line breaks.
- Main keyword in natural spoken flow (never "region + keyword" mechanical repeat).
- FORBIDDEN: "참고1/2", "저장해두세요", "검색하시는 분", "알아보시다 보면", SEO filler.
- Do NOT use example brand names from training; only user Brand field if provided.

SMARTPLACE (owner ops notice, NOT blog summary):
${ctx.channelBriefs.smartplace}
- Short: stock, hours, reservation, season event. Max 1 emoji in title.
- No blog tone, no long storytelling.

INSTAGRAM (short scene caption, save-worthy):
${ctx.channelBriefs.instagram}
- Hook = one short scene line. Line breaks every 1-2 sentences.
- No "저장해두세요", no blog-style explanation. Emoji per brand density: ${ctx.emojiDensity || "medium"}.

SMARTPLACE (NOT a blog summary — owner notice style):
${ctx.channelBriefs.smartplace}
- Write like a store owner posting a short notice (입고/운영/이벤트/예약).
- title: 14-32 chars, can include 1 emoji (e.g. 🌷).
- shortBody: 1-line notice. detailBody: 2-3 short lines only. Total 150-350 chars excluding spaces.
- FORBIDDEN: blog-style explanations, SEO filler, "알아보시다 보면", keyword stuffing.
- cta: visit/reservation, one short line. hashtags: 8-12.

INSTAGRAM (completely different from blog/place — save-worthy caption):
${ctx.channelBriefs.instagram}
- 2025-2026 Korean local brand tone (cafe/flower/lifestyle). Poetic hook allowed.
- hook: 1 line, strong save impulse. body: 180-480 chars, short sentences only.
- lineBreakBody: line break every 1-2 sentences. Max 1 emoji.
- FORBIDDEN: "안녕하세요", "소개해드릴게요", blog paragraphs, SEO repetition.
- ending: soft save CTA. hashtags: 15-22.

HASHTAG:
${ctx.channelBriefs.hashtag}
- Split into localTags, brandTags, seoTags, trendTags, seasonalTags. No duplicates.

IMAGE PROMPT (English):
${ctx.channelBriefs.image}
- Korean local marketing photo style, natural light, white tone, text safe margins, Negative: clause each.`;
}
