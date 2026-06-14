import { LANDING_HERO_MOBILE_TRUST } from "@/lib/brand/copy";

export default function LandingTrustStrip({ className = "" }) {
  if (!LANDING_HERO_MOBILE_TRUST?.length) return null;

  return (
    <ul
      className={`flex flex-wrap items-center justify-center gap-2 ${className}`}
      aria-label="서비스 안내"
    >
      {LANDING_HERO_MOBILE_TRUST.map((label) => (
        <li
          key={label}
          className="rounded-full border border-[var(--vision-line)] bg-[var(--vision-panel-bg,rgba(255,255,255,0.9))] px-3 py-1.5 text-[11px] font-semibold text-[var(--vision-muted)]"
        >
          {label}
        </li>
      ))}
    </ul>
  );
}
