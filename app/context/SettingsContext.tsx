"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type AccentColor = "Cyan" | "Green" | "Amber";
export type ClockFormat  = "24h" | "12h";

export type HudSettings = {
  accentColor:  AccentColor;
  scanline:     boolean;
  animations:   boolean;
  clockFormat:  ClockFormat;
  showSeconds:  boolean;
  showHijri:    boolean;
  modules:      Record<string, boolean>;
};

export const DEFAULT_MODULES: Record<string, boolean> = {
  clock: true, weather: true, spotify: true, news: true,
  github: true, transport: true, missions: true, calendar: true,
  finance: true, prayer: true, system: true, pomodoro: true, scratchpad: true, mood: true,
};

const DEFAULTS: HudSettings = {
  accentColor: "Cyan",
  scanline:    true,
  animations:  true,
  clockFormat: "24h",
  showSeconds: true,
  showHijri:   true,
  modules:     { ...DEFAULT_MODULES },
};

const Ctx = createContext<{
  settings:   HudSettings;
  update:     (patch: Partial<HudSettings>) => void;
  setModule:  (id: string, on: boolean) => void;
}>({ settings: DEFAULTS, update: () => {}, setModule: () => {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<HudSettings>(DEFAULTS);

  useEffect(() => {
    try {
      const s = localStorage.getItem("hud-settings");
      if (s) {
        const p = JSON.parse(s);
        setSettings(prev => ({
          ...prev, ...p,
          modules: { ...prev.modules, ...(p.modules ?? {}) },
        }));
      }
    } catch {}
  }, []);

  const persist = (next: HudSettings) => {
    try { localStorage.setItem("hud-settings", JSON.stringify(next)); } catch {}
  };

  const update = (patch: Partial<HudSettings>) =>
    setSettings(prev => { const next = { ...prev, ...patch }; persist(next); return next; });

  const setModule = (id: string, on: boolean) =>
    setSettings(prev => {
      const next = { ...prev, modules: { ...prev.modules, [id]: on } };
      persist(next);
      return next;
    });

  return <Ctx.Provider value={{ settings, update, setModule }}>{children}</Ctx.Provider>;
}

export function useSettings() { return useContext(Ctx); }
