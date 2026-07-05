import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  for (const raw of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
    const m = raw.trim().match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {}
applyE2eTestCredentialsToEnv(process.env);
const auth = await getE2eBearerToken();
const payload = {
  channel: "place",
  contentChannel: "place",
  channelStandaloneFast: true,
  brandName: "SLA레이어드살롱",
  region: "서울 홍대",
  topic: "5월 컬러 이벤트",
  industry: "미용실",
  placeHeadline: "컬러 이벤트",
  sourceChannel: "form",
  v2ResearchReady: true,
  v2PreWriteVerified: true,
  v2AxisVerified: true,
  researchFacts: [{ axis: "brand", fact: "5월 컬러 이벤트 예약" }],
};
const res = await fetch("https://briclog.ai/api/content/channel", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${auth.token}`,
  },
  body: JSON.stringify(payload),
});
const j = await res.json();
console.log(
  JSON.stringify(
    {
      status: res.status,
      ok: j.ok,
      withheld: j.withheld,
      mode: j.mode,
      userMessage: j.userMessage,
      metaKeys: j.meta ? Object.keys(j.meta) : [],
      placeTitle: j.placeContent?.title,
      placeBodyLen: (j.placeContent?.detailBody || "").length,
      placeMeta: j.placeContent?._meta,
    },
    null,
    2
  )
);
