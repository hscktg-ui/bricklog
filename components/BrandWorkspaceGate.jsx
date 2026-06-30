"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { useBrandWorkspace } from "@/context/BrandWorkspaceContext";

export default function BrandWorkspaceGate() {
  const {
    brands,
    brandsLoading,
    brandWorkspaceGateOpen,
    confirmBrandWorkspaceSelection,
    startBlankBrandSession,
    addBrand,
    isDemoWorkspace,
  } = useBrandWorkspace();
  const [busy, setBusy] = useState(false);

  const sortedBrands = useMemo(
    () =>
      [...brands].sort((a, b) =>
        String(a.brandName || "").localeCompare(String(b.brandName || ""), "ko")
      ),
    [brands]
  );

  if (isDemoWorkspace || !brandWorkspaceGateOpen || brandsLoading) return null;

  const handleSelect = async (brandId) => {
    if (busy) return;
    setBusy(true);
    try {
      await confirmBrandWorkspaceSelection(brandId);
    } finally {
      setBusy(false);
    }
  };

  const handleBlank = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await startBlankBrandSession();
    } finally {
      setBusy(false);
    }
  };

  const handleAddBrand = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const saved = await addBrand("새 브랜드");
      if (saved?.id) await confirmBrandWorkspaceSelection(saved.id);
    } catch (err) {
      window.alert(
        err?.message || "브랜드를 추가하지 못했습니다. 로그인·요금제 한도를 확인해 주세요."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        role="presentation"
        aria-hidden
        className="pointer-events-auto absolute inset-0 bg-[#191F28]/55 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-labelledby="brand-workspace-gate-title"
        aria-describedby="brand-workspace-gate-desc"
        className="pointer-events-auto relative z-10 flex max-h-[min(88vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="border-b border-[#E5E8EB] px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F9EF] text-[#03C75A]">
              <Icon name="layout" className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="brand-workspace-gate-title"
                className="text-[17px] font-bold text-[#191F28]"
              >
                어떤 브랜드로 시작할까요?
              </h2>
              <p
                id="brand-workspace-gate-desc"
                className="mt-1 text-[13px] leading-relaxed text-[#6B7684]"
              >
                이전 브랜드 정보가 새 글에 섞이지 않도록, 먼저 브랜드를 고르거나
                빈 상태로 시작해 주세요.
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {sortedBrands.length === 0 ? (
            <p className="rounded-xl bg-[#F9FAFB] px-4 py-3 text-[13px] text-[#6B7684]">
              저장된 브랜드가 없습니다. 아래에서 빈 브랜드로 시작하거나, 글 작성
              중 새 브랜드가 자동 저장됩니다.
            </p>
          ) : (
            <ul className="space-y-2">
              {sortedBrands.map((brand) => (
                <li key={brand.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleSelect(brand.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-[#E5E8EB] px-4 py-3 text-left transition hover:border-[#03C75A] hover:bg-[#F6FFF9] disabled:opacity-60"
                  >
                    <span>
                      <span className="block text-[14px] font-semibold text-[#191F28]">
                        {brand.brandName || "이름 없음"}
                      </span>
                      {brand.region ? (
                        <span className="mt-0.5 block text-[12px] text-[#8B95A1]">
                          {brand.region}
                          {brand.industry ? ` · ${brand.industry}` : ""}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-[#B0B8C1]">→</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[#E5E8EB] px-5 py-4 space-y-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleAddBrand}
            className="w-full rounded-xl bg-[#03C75A] px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-[#02B350] disabled:opacity-60"
          >
            + 새 브랜드 추가
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleBlank}
            className="w-full rounded-xl border border-dashed border-[#B0B8C1] px-4 py-3 text-[14px] font-medium text-[#4E5968] transition hover:border-[#03C75A] hover:bg-[#F6FFF9] hover:text-[#03C75A] disabled:opacity-60"
          >
            빈 브랜드로 시작 (이전 브랜드 정보 사용 안 함)
          </button>
        </div>
      </div>
    </div>
  );
}
