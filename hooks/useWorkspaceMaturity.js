"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { shouldShowBrandWarehouse } from "@/lib/dashboard/workspaceMaturity";

export function useWorkspaceMaturity({ userId, brandCount = 0, enabled = true }) {
  const [contentLogCount, setContentLogCount] = useState(0);
  const [loading, setLoading] = useState(Boolean(enabled && userId));
  const [showBrandWarehouse, setShowBrandWarehouse] = useState(
    shouldShowBrandWarehouse(0, { brandCount })
  );

  useEffect(() => {
    if (!enabled || !userId) {
      setLoading(false);
      setShowBrandWarehouse(shouldShowBrandWarehouse(0, { brandCount }));
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const q = new URLSearchParams({ brandCount: String(brandCount) });
        const data = await Promise.race([
          fetchWithAuth(`/api/workspace/maturity?${q}`),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("maturity_timeout")), 6_000)
          ),
        ]);
        if (cancelled) return;
        const count = data.contentLogCount ?? 0;
        setContentLogCount(count);
        setShowBrandWarehouse(
          data.showBrandWarehouse ??
            shouldShowBrandWarehouse(count, { brandCount })
        );
      } catch {
        if (!cancelled) {
          setShowBrandWarehouse(
            shouldShowBrandWarehouse(0, { brandCount })
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, brandCount, enabled]);

  return { contentLogCount, showBrandWarehouse, loading };
}
