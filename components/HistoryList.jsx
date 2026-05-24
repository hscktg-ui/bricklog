import { INDUSTRY_OPTIONS } from "@/lib/prompts";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function industryLabel(value) {
  return INDUSTRY_OPTIONS.find((o) => o.value === value)?.label || value;
}

export default function HistoryList({
  records,
  loading,
  selectedId,
  onSelect,
  demoMode = false,
}) {
  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-[13px] text-[#8B95A1]">
        기록을 불러오는 중...
      </div>
    );
  }

  if (!records.length) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#E8EBED] bg-white p-8 text-center">
        <p className="text-[15px] font-semibold text-[#191F28]">
          {demoMode ? "데모에서는 기록이 저장되지 않아요" : "저장된 이야기가 없습니다"}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-[#8B95A1]">
          {demoMode
            ? "로그인 후 생성한 글이 여기에 쌓입니다. 지금은 브랜드 창고와 브라우저에만 남아요."
            : "블로그를 쓰면 자동으로 저장됩니다."}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {records.map((record) => (
        <li key={record.id}>
          <button
            type="button"
            onClick={() => onSelect(record.id)}
            className={`w-full rounded-xl border px-4 py-3 text-left transition ${
              selectedId === record.id
                ? "border-[#03C75A] bg-[#E8F9EF] shadow-sm"
                : "border-[#E8EBED] bg-white hover:bg-[#FAFBFC]"
            }`}
          >
            <p className="text-[14px] font-semibold text-[#191F28]">
              {record.main_keyword || "키워드 없음"}
              <span className="ml-2 text-[12px] font-normal text-[#8B95A1]">
                {industryLabel(record.business_type)}
              </span>
            </p>
            <p className="mt-1 text-[12px] text-[#8B95A1]">
              {record.region || "지역 미입력"} · {formatDate(record.created_at)}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}
