/**
 * STEP 0 — Input Understanding Engine
 */
import { discoverContext, containsRawInputLeak } from "@/lib/pipeline/v2/contextDiscovery";
import { sanitizeText } from "@/utils/sanitizeInput";

const CUSTOMER_RE = /30대|40대|가족|부모|직장인|커플|신혼|학부모|방문객|고객/;
const EMOTION_RE = /감사|기쁨|설렘|부담|편안|따뜻|아쉬|급해|조급|기대|걱정/;

export function analyzeUserInput(input = {}) {
  const discovery = discoverContext(input);
  const d = discovery.discovered;
  const blob = discovery.present.join(" ");

  const customer = CUSTOMER_RE.test(
    [input.targetAudience, input.brandDescription, input.includePhrases].join(" ")
  )
    ? String(
        [input.targetAudience, input.brandDescription, input.includePhrases]
          .join(" ")
          .match(CUSTOMER_RE)?.[0]
      )
    : sanitizeText(input.targetAudience) || null;

  const emotion =
    d.emotion ||
    (EMOTION_RE.test(blob) ? blob.match(EMOTION_RE)?.[0] : null) ||
    null;

  const understood = {
    brand: d.brandName,
    product: d.product,
    service: d.service,
    topic: d.topic,
    event: d.event,
    season: d.season,
    region: d.region,
    emotion,
    customer,
    purpose: d.purposeHint,
    industry: d.industryLabel,
    industryKey: d.industryKey,
    mainKeyword: d.mainKeyword,
    includePhrases: d.includePhrases,
    storeFeatures: d.storeFeatures,
    brandDescription: d.brandDescription,
  };

  const presentFields = Object.entries(understood)
    .filter(([, v]) => v)
    .map(([k]) => k);

  return {
    understood,
    presentFields,
    discovery,
    rawFragments: discovery.rawFragments,
    ready: discovery.hasMinimumSignal,
    noRawCopy: true,
  };
}

export { containsRawInputLeak };
