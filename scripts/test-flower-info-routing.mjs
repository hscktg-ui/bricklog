import { recommendContentPerspective } from "../lib/content/perspectiveEngine.js";
import { recommendContentPersona } from "../lib/persona/contentPersona.js";
import { detectContentIntent } from "../lib/pipeline/v2/intentDetection.js";
import { resolveStoryTarget } from "../lib/product/storyTargetEngine.js";
import { buildMissionExperienceCatalog } from "../lib/product/missionProseEngine.js";
import { deriveTopicWritingContext } from "../lib/content/topicFacetEngine.js";

const input = {
  brandName: "그랩앤고플라워",
  region: "평택",
  topic: "여름에 사야할 꽃 소개",
  industry: "꽃집",
};

const perspective = recommendContentPerspective(input);
const persona = recommendContentPersona(input);
const intent = detectContentIntent({
  topic: input.topic,
  brandName: input.brandName,
  region: input.region,
});
const story = resolveStoryTarget(input)?.target?.id;
const p = deriveTopicWritingContext(input);
const catalog = buildMissionExperienceCatalog(p, input, []);

const failures = [];
if (perspective !== "informational") failures.push(`perspective=${perspective}`);
if (persona.persona !== "info_intro") failures.push(`persona=${persona.persona}`);
if (intent.locked !== "guide") failures.push(`intent=${intent.locked}`);
if (story !== "seasonal_guide") failures.push(`story=${story}`);
if (/직접\s*가서|비교해\s*봤|들었어요/.test(catalog.join(" "))) {
  failures.push("mission still has visit voice");
}

if (failures.length) {
  console.error("FAIL:", failures.join(", "));
  console.log({ perspective, persona, intent: intent.locked, story, catalog: catalog.slice(0, 3) });
  process.exit(1);
}

console.log("OK flower informational routing");
console.log({ perspective, persona: persona.persona, intent: intent.locked, story });
console.log("mission:", catalog.slice(0, 2));
