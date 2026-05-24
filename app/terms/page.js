import LegalPageShell from "@/components/layout/LegalPageShell";
import LegalMarkdownBody from "@/components/legal/LegalMarkdownBody";

export const metadata = {
  title: "이용약관 — BRICLOG",
  description: "BRICLOG 서비스 이용약관",
};

export default function TermsPage() {
  return (
    <LegalPageShell title="이용약관">
      <LegalMarkdownBody slug="terms" />
    </LegalPageShell>
  );
}
