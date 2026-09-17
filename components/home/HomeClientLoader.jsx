"use client";

import dynamic from "next/dynamic";

const HomeClient = dynamic(() => import("@/components/home/HomeClient"), {
  ssr: false,
  loading: () => null,
});

export default function HomeClientLoader({
  trendCatalog,
  initialQuery = "",
  initialCategory = "all",
}) {
  return (
    <HomeClient
      trendCatalog={trendCatalog}
      initialQuery={initialQuery}
      initialCategory={initialCategory}
    />
  );
}
