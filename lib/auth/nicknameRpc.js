/** @param {unknown} data */
export function parseNicknameRpcPayload(data) {
  if (data == null) return null;
  let payload = data;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return null;
    }
  }
  if (Array.isArray(payload) && payload.length === 1) {
    payload = payload[0];
  }
  if (payload && typeof payload.available === "boolean") {
    return {
      available: payload.available,
      valid: payload.valid !== false,
    };
  }
  return null;
}

export function isMissingNicknameRpc(err) {
  const msg = String(err?.message || err?.code || "");
  return (
    err?.code === "PGRST202" ||
    /check_nickname_available/i.test(msg) ||
    /function.*does not exist/i.test(msg)
  );
}
