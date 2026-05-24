import Link from "next/link";
import Logo from "@/components/Logo";

export default function LegalPageShell({ title, children }) {
  return (
    <div className="min-h-0 flex-1 bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 md:px-6">
          <Logo iconSize={24} />
          <Link
            href="/"
            className="text-[13px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--brand)] hover:underline underline-offset-4"
          >
            ← 홈으로
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
        <h1 className="text-[26px] font-bold tracking-tight md:text-[28px]">
          {title}
        </h1>
        <article className="legal-prose mt-8">{children}</article>
      </main>
    </div>
  );
}
