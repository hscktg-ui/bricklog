"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  loadAllBrands,
  loadAgency,
  upsertBrand,
  brandMemoryToFormInput,
  mergeBrandFromForm,
  saveAllBrands,
  recordBrandContent,
  createEmptyBrandMemory,
  importDemoSampleBrands,
} from "@/lib/brands/brandMemory";
import { setBrandStorageScope } from "@/lib/brands/brandStorageScope";
import { isInternalDemoWorkspace } from "@/lib/user/workspaceStorage";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { brandDraftToApiBody } from "@/lib/brands/brandApiPayload";
import { isMissingBrandsTable } from "@/lib/api/supabaseErrors";
import { brandToRow } from "@/lib/brands/brandMapper";
import {
  resolveBrandFromFormSync as resolveBrandFromFormSyncImpl,
  buildProvisionalBrandFromForm as buildProvisionalBrandFromFormImpl,
} from "@/lib/brands/resolveBrandForForm";

const BrandWorkspaceContext = createContext(null);

function findBrand(brands, id) {
  return brands.find((b) => b.id === id) || null;
}

export function BrandWorkspaceProvider({ children, userId, demoMode = false }) {
  const [agency, setAgency] = useState(null);
  const [brands, setBrands] = useState([]);
  const [activeBrandId, setActiveBrandId] = useState(null);
  const [loading, setLoading] = useState(false);
  const isDemo = isInternalDemoWorkspace(userId, demoMode);
  const useServer =
    !demoMode && isSupabaseConfigured && Boolean(userId);

  const reloadLocal = useCallback(() => {
    setBrandStorageScope({ userId, demoMode });
    const list = loadAllBrands();
    const ag = loadAgency();
    setBrands(list);
    setAgency(ag);
    setActiveBrandId((prev) =>
      prev && list.some((b) => b.id === prev) ? prev : null
    );
  }, [userId, demoMode]);

  const reloadFromServer = useCallback(async () => {
    setLoading(true);
    try {
      const data = await Promise.race([
        fetchWithAuth("/api/brands"),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("brands_timeout")), 8_000)
        ),
      ]);
      const list = data.brands || [];
      setBrands(list);
      setAgency({ name: "내 브랜드 창고", brandIds: list.map((b) => b.id) });
      setActiveBrandId((prev) =>
        prev && list.some((b) => b.id === prev) ? prev : null
      );
    } catch {
      reloadLocal();
    } finally {
      setLoading(false);
    }
  }, [reloadLocal]);

  const reloadBrands = useCallback(() => {
    if (useServer) return reloadFromServer();
    reloadLocal();
  }, [useServer, reloadFromServer, reloadLocal]);

  useEffect(() => {
    reloadBrands();
  }, [reloadBrands]);

  const activeBrand = useMemo(
    () => (activeBrandId ? findBrand(brands, activeBrandId) : null),
    [activeBrandId, brands]
  );

  const selectBrand = useCallback((id) => {
    setActiveBrandId(id);
  }, []);

  const saveBrandLocally = useCallback(
    (draft) => {
      const saved = upsertBrand(draft);
      reloadLocal();
      setActiveBrandId(saved.id);
      return saved;
    },
    [reloadLocal]
  );

  const addBrand = useCallback(
    async (name, seed = {}) => {
      const draft = createEmptyBrandMemory({
        brandName: name || "새 브랜드",
        ...seed,
      });
      if (useServer) {
        try {
          const data = await fetchWithAuth("/api/brands", {
            method: "POST",
            body: JSON.stringify(brandDraftToApiBody(draft)),
          });
          const saved = data.brand;
          setBrands((prev) => [saved, ...prev]);
          setActiveBrandId(saved.id);
          return saved;
        } catch (err) {
          if (isMissingBrandsTable(err)) {
            try {
              sessionStorage.setItem(
                "briclog-flash",
                "브랜드 저장을 이 기기에만 임시로 했습니다. 서버 저장이 가능해지면 다시 저장해 주세요."
              );
            } catch {
              /* ignore */
            }
            return saveBrandLocally(draft);
          }
          throw err;
        }
      }
      return saveBrandLocally(draft);
    },
    [useServer, saveBrandLocally]
  );

  const updateActiveBrand = useCallback(
    async (patch) => {
      if (!activeBrand) return null;
      const next = { ...activeBrand, ...patch };
      if (useServer) {
        try {
          const data = await fetchWithAuth(`/api/brands/${activeBrand.id}`, {
            method: "PATCH",
            body: JSON.stringify(brandDraftToApiBody(next)),
          });
          const saved = data.brand;
          setBrands((prev) =>
            prev.map((b) => (b.id === saved.id ? saved : b))
          );
          return saved;
        } catch (err) {
          if (isMissingBrandsTable(err)) {
            const saved = upsertBrand(next);
            reloadLocal();
            return saved;
          }
          throw err;
        }
      }
      const saved = upsertBrand(next);
      reloadLocal();
      return saved;
    },
    [activeBrand, useServer, reloadLocal]
  );

  const resetAllBrands = useCallback(async () => {
    if (useServer) {
      try {
        await fetchWithAuth("/api/brands/reset", { method: "DELETE" });
      } catch (err) {
        if (!isMissingBrandsTable(err)) throw err;
      }
    }
    saveAllBrands([]);
    setBrands([]);
    setActiveBrandId(null);
    setAgency({ name: "내 브랜드 창고", brandIds: [] });
  }, [useServer]);

  const deleteBrand = useCallback(
    async (brandId) => {
      const id = brandId || activeBrandId;
      if (!id) return;
      if (useServer) {
        try {
          await fetchWithAuth(`/api/brands/${id}`, { method: "DELETE" });
        } catch (err) {
          if (!isMissingBrandsTable(err)) throw err;
        }
        setBrands((prev) => prev.filter((b) => b.id !== id));
        setActiveBrandId((prev) => (prev === id ? null : prev));
        const list = loadAllBrands().filter((b) => b.id !== id);
        saveAllBrands(list);
        return;
      }
      const list = loadAllBrands().filter((b) => b.id !== id);
      saveAllBrands(list);
      reloadLocal();
      setActiveBrandId((prev) => (prev === id ? null : prev));
    },
    [activeBrandId, useServer, reloadLocal]
  );

  const applyActiveBrandToForm = useCallback(() => {
    return brandMemoryToFormInput(activeBrand);
  }, [activeBrand]);

  const persistFormToBrand = useCallback(
    async (formInput) => {
      if (!activeBrandId || !activeBrand) return;
      const synced = mergeBrandFromForm(activeBrand, formInput);
      if (useServer) {
        try {
          const row = brandToRow(synced, userId);
          const data = await fetchWithAuth(`/api/brands/${activeBrandId}`, {
            method: "PATCH",
            body: JSON.stringify({
              ...brandDraftToApiBody(synced),
              metadata: row.metadata,
            }),
          });
          const saved = data.brand;
          setBrands((prev) =>
            prev.map((b) => (b.id === saved.id ? saved : b))
          );
          return;
        } catch (err) {
          if (isMissingBrandsTable(err)) {
            upsertBrand(synced);
            reloadLocal();
            return;
          }
          throw err;
        }
      }
      upsertBrand(synced);
      reloadLocal();
    },
    [activeBrandId, activeBrand, useServer, userId, reloadLocal]
  );

  const importDemoSamples = useCallback(() => {
    const seeds = importDemoSampleBrands();
    reloadLocal();
    return seeds;
  }, [reloadLocal]);

  const applyBrandToForm = useCallback(
    (brandId) => {
      const brand = findBrand(brands, brandId);
      if (!brand) return null;
      setActiveBrandId((prev) => (prev === brandId ? prev : brandId));
      return brandMemoryToFormInput(brand);
    },
    [brands]
  );

  const resolveBrandFromFormSync = useCallback(
    (formInput) =>
      resolveBrandFromFormSyncImpl(formInput, brands, activeBrandId),
    [brands, activeBrandId]
  );

  const buildProvisionalBrandFromForm = useCallback(
    (formInput) =>
      buildProvisionalBrandFromFormImpl(formInput, activeBrand),
    [activeBrand]
  );

  const ensureBrandFromForm = useCallback(
    async (formInput) => {
      const sync = resolveBrandFromFormSyncImpl(
        formInput,
        brands,
        activeBrandId
      );
      if (sync) {
        if (sync.id !== activeBrandId) setActiveBrandId(sync.id);
        return sync;
      }
      const name = formInput?.brandName?.trim();
      if (!name) return null;
      return addBrand(name, {
        brandType: formInput.brandType || "other",
        industry: formInput.industry || "",
        region: formInput.region?.trim() || "",
      });
    },
    [activeBrandId, brands, addBrand]
  );

  const saveChannelContent = useCallback(
    async (channel, content, plainText = "") => {
      if (!activeBrandId || !activeBrand) return;
      if (!useServer) {
        recordBrandContent(activeBrandId, channel, content, plainText);
        reloadLocal();
        return;
      }
      const at = new Date().toISOString();
      const archive = {
        ...(activeBrand.contentArchive || { blog: [], place: [], insta: [] }),
      };
      const entry = {
        at,
        text: plainText?.slice(0, 2000) || "",
        versionSource:
          content?._meta?.generationMode || content?._meta?.source || "generate",
      };
      archive[channel] = [...(archive[channel] || []), entry].slice(-5);
      const next = {
        ...activeBrand,
        contentArchive: archive,
        recentContent: {
          ...activeBrand.recentContent,
          [channel]: {
            at,
            preview:
              channel === "blog"
                ? content?.representativeTitle
                : channel === "place"
                  ? content?.title
                  : content?.hook,
          },
        },
      };
      const row = brandToRow(next, userId);
      const data = await fetchWithAuth(`/api/brands/${activeBrandId}`, {
        method: "PATCH",
        body: JSON.stringify({ metadata: row.metadata }),
      });
      const saved = data.brand;
      setBrands((prev) => prev.map((b) => (b.id === saved.id ? saved : b)));
    },
    [activeBrandId, activeBrand, useServer, userId, reloadLocal]
  );

  const value = useMemo(
    () => ({
      agency,
      brands,
      allBrands: brands,
      activeBrand,
      activeBrandId,
      selectBrand,
      addBrand,
      updateActiveBrand,
      deleteBrand,
      resetAllBrands,
      applyActiveBrandToForm,
      persistFormToBrand,
      saveChannelContent,
      isDemoWorkspace: isDemo,
      userId,
      reloadBrands,
      importDemoSamples,
      applyBrandToForm,
      ensureBrandFromForm,
      resolveBrandFromFormSync,
      buildProvisionalBrandFromForm,
      brandsLoading: loading,
      useServerBrands: useServer,
    }),
    [
      agency,
      brands,
      activeBrand,
      activeBrandId,
      selectBrand,
      addBrand,
      updateActiveBrand,
      deleteBrand,
      resetAllBrands,
      applyActiveBrandToForm,
      persistFormToBrand,
      saveChannelContent,
      isDemo,
      userId,
      reloadBrands,
      importDemoSamples,
      applyBrandToForm,
      ensureBrandFromForm,
      resolveBrandFromFormSync,
      buildProvisionalBrandFromForm,
      loading,
      useServer,
    ]
  );

  return (
    <BrandWorkspaceContext.Provider value={value}>
      {children}
    </BrandWorkspaceContext.Provider>
  );
}

export function useBrandWorkspace() {
  const ctx = useContext(BrandWorkspaceContext);
  if (!ctx) {
    throw new Error("useBrandWorkspace must be used within BrandWorkspaceProvider");
  }
  return ctx;
}
