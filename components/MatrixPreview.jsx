import {
  BUSINESS_TYPE_OPTIONS,
  PURPOSE_OPTIONS,
  TONE_OPTIONS,
} from "@/lib/constants";
import { getIndustriesForType } from "@/lib/prompts/businessTypes";

export default function MatrixPreview({ values }) {
  const bt = BUSINESS_TYPE_OPTIONS.find((o) => o.value === values.businessType);
  const ind = getIndustriesForType(values.businessType).find(
    (o) => o.value === values.industry
  );
  const purpose = PURPOSE_OPTIONS.find((o) => o.value === values.purpose);
  const tone = TONE_OPTIONS.find((o) => o.value === values.tone);

  const chips = [
    bt?.label,
    ind?.label,
    purpose?.label,
    tone?.label,
    values.region?.trim(),
    values.mainKeyword?.trim() || values.brandName?.trim(),
  ].filter(Boolean);

  if (chips.length === 0) return null;

  return (
    <div className="rounded-xl border border-dashed border-[#03C75A]/30 bg-[#FAFBFC] px-3 py-2.5">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[#8B95A1]">
        생성 미리보기
      </p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <span
            key={c}
            className="rounded-lg bg-white px-2 py-0.5 text-[11px] font-medium text-[#4E5968] ring-1 ring-[#E8EBED]"
          >
            {c}
          </span>
        ))}
      </div>
      {bt?.hint && (
        <p className="mt-1.5 text-[10px] text-[#8B95A1]">{bt.hint}</p>
      )}
    </div>
  );
}
