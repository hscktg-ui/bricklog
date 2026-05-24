export default function UsageCard({ used, limit }) {
  const percent = Math.min(100, Math.round((used / limit) * 100));
  const remaining = Math.max(0, limit - used);

  return (
    <div className="rounded-2xl border border-[#E8EBED] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#4E5968]">이번 달 생성</p>
        <span className="rounded-full bg-[#E8F9EF] px-2 py-0.5 text-[10px] font-bold text-[#03A94D]">
          Free
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-[#191F28]">
        {used}
        <span className="text-base font-medium text-[#8B95A1]"> / {limit}</span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F2F4F6]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#03C75A] to-[#02B350] transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] text-[#8B95A1]">
        {remaining}회 남음 · Pro는 무제한
      </p>
    </div>
  );
}
