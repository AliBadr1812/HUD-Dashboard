"use client";

import { useEffect, ReactNode } from "react";
import { SettingsProvider, useSettings } from "../context/SettingsContext";

function Inner({ children }: { children: ReactNode }) {
  const { settings } = useSettings();

  useEffect(() => {
    document.documentElement.setAttribute("data-accent", settings.accentColor.toLowerCase());
  }, [settings.accentColor]);

  useEffect(() => {
    document.documentElement.classList.toggle("no-anim", !settings.animations);
  }, [settings.animations]);

  return (
    <>
      {settings.scanline && <div className="scanline" />}
      {children}
    </>
  );
}

export default function HudSettingsProvider({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <Inner>{children}</Inner>
    </SettingsProvider>
  );
}
