import LegalPageShell from "@/components/layout/LegalPageShell";
import LegalMarkdownBody from "@/components/legal/LegalMarkdownBody";

export const metadata = {
  title: "환불정책 — BRICLOG",
  description: "BRICLOG 유료 구독 환불정책",
};

export default function RefundPage() {
  return (
    <LegalPageShell title="환불정책">
      <LegalMarkdownBody slug="refund" />
    </LegalPageShell>
  );
}
