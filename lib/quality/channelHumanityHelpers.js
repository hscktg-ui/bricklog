/** channelHumanityBenchmark — v4 cliche counter (순환 import 방지) */
import { V4_AI_CLICHES } from "@/lib/quality/v4ContentAudit";

export function countCliches(text) {
  let n = 0;
  for (const p of V4_AI_CLICHES) {
    if (String(text || "").includes(p)) n += 1;
  }
  return n;
}
