import LegalPageShell from "@/components/layout/LegalPageShell";
import LegalMarkdownBody from "@/components/legal/LegalMarkdownBody";

export const metadata = {
  title: "개인정보처리방침 — BRICLOG",
  description: "BRICLOG 개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="개인정보처리방침">
      <LegalMarkdownBody slug="privacy" />
    </LegalPageShell>
  );
}
