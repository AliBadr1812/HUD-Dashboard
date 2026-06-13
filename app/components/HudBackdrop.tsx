"use client";

import { useAnyModalOpen } from "./HudModal";

export default function HudBackdrop() {
  const anyOpen = useAnyModalOpen();
  return (
    <div
      className={`fixed inset-0 z-[50] bg-black/40 pointer-events-none transition-opacity duration-200 ${anyOpen ? "opacity-100" : "opacity-0"}`}
    />
  );
}
