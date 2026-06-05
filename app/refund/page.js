import LegalPageShell from "@/components/layout/LegalPageShell";
import LegalMarkdownBody from "@/components/legal/LegalMarkdownBody";
import { buildLegalPageMetadata } from "@/lib/brand/seo";

export const metadata = buildLegalPageMetadata({
  title: "환불정책",
  description: "BRICLOG(브릭로그) 유료 구독 환불정책",
  path: "/refund",
});

export default function RefundPage() {
  return (
    <LegalPageShell title="환불정책">
      <LegalMarkdownBody slug="refund" />
    </LegalPageShell>
  );
}
