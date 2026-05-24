let scope = { userId: null, demoMode: false };

export function setBrandStorageScope(next) {
  scope = { userId: next?.userId ?? null, demoMode: Boolean(next?.demoMode) };
}

export function getBrandStorageScope() {
  return scope;
}
