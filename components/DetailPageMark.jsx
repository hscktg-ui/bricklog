import Link from "next/link";
import { DETAIL_PAGE_PRODUCT } from "@/lib/product/detailPageProduct";

export default function DetailPageMark({ href = "/detail" }) {
  return (
    <Link href={href} className="flex min-h-[40px] flex-col justify-center" aria-label={DETAIL_PAGE_PRODUCT.name}>
      <span className="text-[17px] font-semibold tracking-[-0.03em] text-[var(--vision-ink)]">
        {DETAIL_PAGE_PRODUCT.name}
      </span>
      <span className="text-[11px] font-medium tracking-[0.04em] text-[var(--vision-muted)]">
        {DETAIL_PAGE_PRODUCT.place}
      </span>
    </Link>
  );
}
