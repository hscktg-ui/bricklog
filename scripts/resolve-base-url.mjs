/** prelaunch · eight-user-smoke — live dev/prod URL (3005 → 3000 → 3002) */
const PORT_PROBE_ORDER = [3005, 3000, 3002];

export async function probePort(port) {
  const url = `http://127.0.0.1:${port}/`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 4000);
  try {
    const res = await fetch(url, { signal: ac.signal, redirect: "manual" });
    clearTimeout(t);
    return res.status > 0 && res.status < 500;
  } catch {
    clearTimeout(t);
    return false;
  }
}

export async function resolveLiveBaseUrl(env = process.env) {
  if (env.BASE_URL) return env.BASE_URL;
  for (const port of PORT_PROBE_ORDER) {
    if (await probePort(port)) {
      return `http://127.0.0.1:${port}`;
    }
  }
  return "http://127.0.0.1:3005";
}

export async function isServerUp(baseUrl) {
  try {
    const port = Number(new URL(baseUrl).port) || 3005;
    return probePort(port);
  } catch {
    return false;
  }
}
