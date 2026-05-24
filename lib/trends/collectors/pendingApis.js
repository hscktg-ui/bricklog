import { collectorResult } from "./base";

function pending(source, envKey) {
  const configured = process.env[envKey];
  return collectorResult(source, {
    ok: false,
    items: [],
    error: configured
      ? "collector_not_implemented"
      : `missing_env:${envKey}`,
    meta: { pending: true, envKey },
  });
}

export async function collectNaver() {
  return pending("naver", "NAVER_CLIENT_ID");
}

export async function collectGoogle() {
  return pending("google", "GOOGLE_TRENDS_API_KEY");
}

export async function collectInstagram() {
  return pending("instagram", "META_GRAPH_TOKEN");
}

export async function collectYoutube() {
  return pending("youtube", "YOUTUBE_DATA_API_KEY");
}
