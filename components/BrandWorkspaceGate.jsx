"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { useBrandWorkspace } from "@/context/BrandWorkspaceContext";

/**
 * 브랜드 선택 게이트.
 * z-index는 사이드바(z-50)·하단탭(z-45)보다 낮게 두어
 * Review / Library 등 메뉴 진입을 가로막지 않는다.
 */
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
    <div
      className="pointer-events-none fixed inset-0 z-[35] flex items-center justify-center p-4 lg:pl-[200px]"
      data-briclog-gate="brand-workspace"
    >
      <div
        role="presentation"
        aria-hidden
        className="pointer-events-auto absolute inset-0 bg-[#111111]/45 backdrop-blur-[2px] lg:left-[200px]"
      />
      <div
        role="dialog"
        aria-labelledby="brand-workspace-gate-title"
        aria-describedby="brand-workspace-gate-desc"
        className="pointer-events-auto relative z-10 flex max-h-[min(88vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-[rgba(17,17,17,0.08)] bg-white shadow-[0_24px_80px_rgba(17,17,17,0.18)]"
      >
        <div className="border-b border-[#EEF2EF] px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F0F7F2] text-[#03A94D]">
              <Icon name="layout" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5F6B66]">
                Today · Brand
              </p>
              <h2
                id="brand-workspace-gate-title"
                className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-[#111111]"
              >
                어떤 브랜드로 시작할까요?
              </h2>
              <p
                id="brand-workspace-gate-desc"
                className="mt-2 text-[13px] leading-relaxed text-[#5F6B66]"
              >
                이전 브랜드 정보가 새 글에 섞이지 않도록, 먼저 브랜드를 고르거나
                빈 상태로 시작해 주세요. Review·Library는 왼쪽 메뉴에서도 바로
                열 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {sortedBrands.length === 0 ? (
            <p className="rounded-2xl bg-[#F7F8F7] px-4 py-3 text-[13px] text-[#5F6B66]">
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
                    className="flex w-full items-center justify-between rounded-2xl border border-[#E7ECE8] px-4 py-3 text-left transition hover:border-[#03C75A] hover:bg-[#F8FCF9] disabled:opacity-60"
                  >
                    <span>
                      <span className="block text-[14px] font-semibold text-[#111111]">
                        {brand.brandName || "이름 없음"}
                      </span>
                      {brand.region ? (
                        <span className="mt-0.5 block text-[12px] text-[#8A948F]">
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

        <div className="space-y-2 border-t border-[#EEF2EF] px-5 py-4">
          <button
            type="button"
            disabled={busy}
            onClick={handleAddBrand}
            className="w-full rounded-full bg-[#111111] px-4 py-3 text-[14px] font-semibold text-white transition hover:opacity-92 disabled:opacity-60"
          >
            + 새 브랜드 추가
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleBlank}
            className="w-full rounded-full border border-dashed border-[#C6CFCA] px-4 py-3 text-[14px] font-medium text-[#4F5A56] transition hover:border-[#03C75A] hover:bg-[#F8FCF9] hover:text-[#03A94D] disabled:opacity-60"
          >
            빈 브랜드로 시작 (이전 브랜드 정보 사용 안 함)
          </button>
        </div>
      </div>
    </div>
  );
}
