"use client";

import dynamic from "next/dynamic";

const HomeClient = dynamic(() => import("@/components/home/HomeClient"), {
  ssr: false,
  loading: () => null,
});

export default function HomeClientLoader() {
  return <HomeClient />;
}
