/**
 * node --import ./scripts/register-alias.mjs scripts/test-clue-discovery.mjs
 */
import { discoverClues, expandEntityVariants } from "../lib/content/clueDiscoveryEngine.js";

const input = {
  brandName: "에이스침대",
  region: "파주",
  topic: "오피모3",
  mainKeyword: "오피모3",
  industry: "가구",
  storeFeatures: "수면 상담 매장",
  includePhrases: "신규 전시, 프레임",
};

const d = discoverClues(input);
console.log("variants:", expandEntityVariants("오피모3", { brandName: "에이스침대" }));
console.log("facts:", d.facts.length);
console.log("inferences:", d.inferences.map((i) => i.label).join(", "));
console.log("queries:", d.searchQueries.slice(0, 5));
console.log("canWrite:", d.canWrite);
process.exit(d.facts.length >= 4 && d.entityVariants.length >= 3 ? 0 : 1);
