import LegalPageShell from "@/components/layout/LegalPageShell";
import LegalMarkdownBody from "@/components/legal/LegalMarkdownBody";
import { buildLegalPageMetadata } from "@/lib/brand/seo";

export const metadata = buildLegalPageMetadata({
  title: "개인정보처리방침",
  description:
    "BRICLOG(브릭로그) 개인정보처리방침 — 회원정보·휴대폰 인증·서비스 이용 시 개인정보 처리 안내",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalPageShell title="개인정보처리방침">
      <LegalMarkdownBody slug="privacy" />
    </LegalPageShell>
  );
}
