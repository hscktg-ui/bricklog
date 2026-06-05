/** @deprecated 레거시 CreateWorkspace — 고객용 한 줄만 */
export default function MatrixBanner() {
  return (
    <div className="mb-3 rounded-xl border border-[#03C75A]/15 bg-[#F0FFF5] px-4 py-3">
      <p className="text-[13px] font-semibold text-[#191F28]">
        완성본이 준비되었습니다
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-[#4E5968]">
        아래에서 복사한 뒤 네이버·플레이스·인스타에 붙여 넣으세요.
      </p>
    </div>
  );
}
