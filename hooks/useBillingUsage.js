"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { BILLING_USAGE_REFRESH_EVENT } from "@/lib/billing/billingUsageEvents";

/**
 * @typedef {'loading'|'ready'|'unknown'} BillingUsagePhase
 */

/**
 * @returns {{ usage: object|null, phase: BillingUsagePhase, refresh: () => void }}
 */
export function useBillingUsage() {
  const [usage, setUsage] = useState(null);
  const [phase, setPhase] = useState("loading");

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const data = await fetchWithAuth("/api/billing/usage");
      setUsage(data?.usage ?? null);
      setPhase(data?.usage ? "ready" : "unknown");
    } catch {
      setUsage(null);
      setPhase("unknown");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => {
      void load();
    };
    window.addEventListener(BILLING_USAGE_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(BILLING_USAGE_REFRESH_EVENT, onRefresh);
  }, [load]);

  return { usage, phase, refresh: load };
}
