import LegalPageShell from "@/components/layout/LegalPageShell";
import LegalMarkdownBody from "@/components/legal/LegalMarkdownBody";
import { buildLegalPageMetadata } from "@/lib/brand/seo";

export const metadata = buildLegalPageMetadata({
  title: "이용약관",
  description:
    "BRICLOG(브릭로그) 서비스 이용약관 — 네이버·인스타 브랜드 글쓰기 서비스 이용 조건",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPageShell title="이용약관">
      <LegalMarkdownBody slug="terms" />
    </LegalPageShell>
  );
}
