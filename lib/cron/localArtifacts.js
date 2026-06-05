/** Vercel·서버리스에서는 .data / docs 로컬 쓰기 생략 */
export function canWriteLocalCronArtifacts() {
  return !process.env.VERCEL;
}

export function safeLocalCronWrite(fn) {
  if (!canWriteLocalCronArtifacts()) return null;
  try {
    return fn();
  } catch (err) {
    if (err?.code === "ENOENT" || err?.code === "EROFS" || err?.code === "EACCES") {
      return null;
    }
    throw err;
  }
}
