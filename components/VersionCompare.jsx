"use client";

export default function VersionCompare({ compare }) {
  if (!compare || compare.before == null) return null;
  const up = compare.delta > 0;
  return (
    <div className="rounded-lg bg-[#F7F8FA] px-3 py-2 text-[11px] text-[#4E5968]">
      <span className="text-[#8B95A1]">개선 전 </span>
      <strong>{compare.before}점</strong>
      <span className="mx-1">→</span>
      <span className="text-[#8B95A1]">개선 후 </span>
      <strong className={up ? "text-[#03A94D]" : "text-[#E67700]"}>
        {compare.after}점
      </strong>
      {compare.delta !== 0 && (
        <span className={`ml-1 ${up ? "text-[#03A94D]" : "text-[#E67700]"}`}>
          ({up ? "+" : ""}
          {compare.delta})
        </span>
      )}
    </div>
  );
}
