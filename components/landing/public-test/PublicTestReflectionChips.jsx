"use client";

/**
 * 작업실 BriclogStrengthChips와 동일 SSOT — 공개 테스트 결과 상단
 */
export default function PublicTestReflectionChips({ chips = [] }) {
  if (!chips.length) return null;

  return (
    <div
      className="flex flex-wrap gap-1.5 px-5 pt-4"
      aria-label="입력·화자·조사 반영"
    >
      {chips.map((chip) => (
        <span
          key={chip.id}
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
            chip.warn
              ? "border-[rgba(255,149,0,0.25)] bg-[rgba(255,149,0,0.08)] text-[var(--vision-ink)]"
              : "border-[rgba(48,209,88,0.2)] bg-[rgba(48,209,88,0.08)] text-[var(--vision-ink)]"
          }`}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}
