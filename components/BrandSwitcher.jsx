"use client";

import { useMemo, useState } from "react";
import { searchBrands } from "@/lib/brands/brandMemory";
import ConfirmModal from "@/components/ConfirmModal";
import { useBrandWorkspace } from "@/context/BrandWorkspaceContext";

export default function BrandSwitcher({
  onBrandChange,
  onMobileClose,
  defaultOpen = false,
  summaryLine,
  compact = false,
}) {
  const {
    agency,
    brands,
    activeBrand,
    activeBrandId,
    selectBrand,
    addBrand,
    deleteBrand,
    resetAllBrands,
    isDemoWorkspace,
    importDemoSamples,
  } = useBrandWorkspace();
  const [open, setOpen] = useState(defaultOpen);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [localSearch, setLocalSearch] = useState("");

  const filteredBrands = useMemo(
    () => searchBrands(localSearch, brands),
    [localSearch, brands]
  );

  const handleSelect = (id) => {
    if (id === activeBrandId) {
      setOpen(false);
      onMobileClose?.();
      return;
    }
    setOpen(false);
    if (onBrandChange) {
      onBrandChange(id);
    } else {
      selectBrand(id);
    }
    onMobileClose?.();
  };

  const handleAdd = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const b = await addBrand("새 브랜드");
      handleSelect(b.id);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!activeBrandId || busy) return;
    setBusy(true);
    try {
      await deleteBrand(activeBrandId);
      setConfirmDelete(false);
      setOpen(false);
      onMobileClose?.();
    } catch (err) {
      window.alert(err.message || "삭제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const handleResetAll = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await resetAllBrands();
      setConfirmResetAll(false);
      setOpen(false);
      onMobileClose?.();
    } catch (err) {
      window.alert(err.message || "초기화에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const wrapClass = compact ? "" : "border-b border-[#E8EBED] px-3 py-3";

  return (
    <div className={wrapClass}>
      {!compact && (
        <p className="text-[12px] font-semibold text-[#191F28]">내 브랜드 창고</p>
      )}
      {!compact && agency?.name && agency.name !== "내 브랜드 창고" && (
        <p className="mt-0.5 text-[11px] text-[#8B95A1]">
          {agency.name}
          {isDemoWorkspace && (
            <span className="ml-1 text-[#E67700]">· 내부데모</span>
          )}
        </p>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full flex-col gap-0.5 rounded-lg border border-[#E8EBED] bg-white px-2.5 py-2 text-left hover:border-[#03C75A]/40 ${
          compact ? "" : "mt-2 bg-[#F7F8FA] px-3 py-2.5"
        }`}
      >
        <span className="flex w-full items-center justify-between gap-2">
          <span
            className={`truncate text-[13px] font-semibold ${
              activeBrand ? "text-[#191F28]" : "text-[#8B95A1]"
            }`}
          >
            {activeBrand?.brandName || "브랜드를 선택해 주세요"}
          </span>
          <span className="shrink-0 text-[11px] text-[#8B95A1]" aria-hidden>
            {open ? "▴" : "▾"}
          </span>
          <span className="sr-only">{open ? "브랜드 목록 접기" : "브랜드 목록 펼치기"}</span>
        </span>
        {!open && summaryLine && (
          <span className="truncate text-[12px] text-[#4E5968]">{summaryLine}</span>
        )}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-[#E8EBED] bg-white p-2 shadow-sm">
          <input
            type="search"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="브랜드 검색"
            className="mb-2 w-full rounded-md border border-[#E8EBED] px-2 py-1.5 text-[12px]"
          />
          <ul className="max-h-[min(240px,40vh)] space-y-0.5 overflow-y-auto sm:max-h-[160px]">
            {brands.length === 0 && (
              <li className="px-2 py-2 text-[11px] text-[#8B95A1]">
                저장된 브랜드가 없습니다.
                <br />
                아래에서 추가해 주세요.
              </li>
            )}
            {filteredBrands.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(b.id)}
                  className={`w-full rounded-md px-2 py-2 text-left text-[12px] ${
                    b.id === activeBrandId
                      ? "bg-[#E8F9EF] font-semibold text-[#03A94D]"
                      : "text-[#4E5968] hover:bg-[#F7F8FA]"
                  }`}
                >
                  {b.brandName}
                  {b.region && (
                    <span className="ml-1 text-[#8B95A1]">· {b.region}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {isDemoWorkspace && brands.length === 0 && (
            <button
              type="button"
              onClick={() => {
                const seeds = importDemoSamples();
                const first = seeds?.[0];
                if (first?.id) handleSelect(first.id);
              }}
              className="mt-2 w-full rounded-md border border-dashed border-[#E8EBED] py-2 text-[11px] text-[#4E5968] hover:border-[#03C75A]"
            >
              샘플 브랜드 불러오기 (선택)
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={handleAdd}
            className="mt-2 w-full rounded-md py-2 text-[11px] font-medium text-[#03A94D] hover:bg-[#F7F8FA] disabled:opacity-50"
          >
            + 브랜드 추가
          </button>
          {activeBrandId && !isDemoWorkspace && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
              className="mt-1 w-full rounded-md py-1.5 text-[11px] text-[#E42939] hover:bg-[#FFF5F5] disabled:opacity-50"
            >
              선택 브랜드 삭제
            </button>
          )}
          {!isDemoWorkspace && brands.length > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmResetAll(true)}
              className="mt-1 w-full rounded-md border border-[#FFE0E0] py-1.5 text-[11px] font-semibold text-[#C91F2E] hover:bg-[#FFF5F5] disabled:opacity-50"
            >
              전체 초기화
            </button>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmDelete}
        title="브랜드 삭제"
        message={`"${activeBrand?.brandName || "브랜드"}"를 삭제할까요?\n\n이 브랜드 설정만 제거됩니다. 저장한 글·초안 기록은 계정에 남을 수 있습니다.`}
        confirmLabel="삭제"
        variant="danger"
        busy={busy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />

      <ConfirmModal
        open={confirmResetAll}
        title="브랜드 전체 초기화"
        message={
          "등록된 브랜드를 모두 삭제합니다.\n\n· 서버에 저장된 브랜드 프로필이 제거됩니다.\n· 이 기기의 브랜드 목록(localStorage)도 비워집니다.\n· 저장한 글·초안·구독 정보는 그대로일 수 있습니다.\n\n되돌릴 수 없습니다. 계속할까요?"
        }
        confirmLabel="전체 삭제"
        variant="danger"
        busy={busy}
        onCancel={() => setConfirmResetAll(false)}
        onConfirm={handleResetAll}
      />
    </div>
  );
}
