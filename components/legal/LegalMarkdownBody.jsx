import { loadLegalDocument } from "@/lib/legal/loadLegalDocument";

/**
 * @param {{ slug: "terms"|"privacy"|"refund" }} props
 */
export default function LegalMarkdownBody({ slug }) {
  const { meta, content } = loadLegalDocument(slug);
  const effective = meta.effective || "2026년 5월 22일";
  const revised = meta.revised || effective;

  return (
    <>
      <p className="text-[13px] text-[var(--muted)]">
        시행일: {effective}
        {revised !== effective ? ` · 최종 개정일: ${revised}` : null}
      </p>
      {content}
    </>
  );
}
