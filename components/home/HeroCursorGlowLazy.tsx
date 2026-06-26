"use client";

import dynamic from "next/dynamic";

export const HeroCursorGlowLazy = dynamic(
  () => import("./HeroCursorGlow").then((mod) => mod.HeroCursorGlow),
  { ssr: false },
);
