"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import HudPanel from "./HudPanel";

type MoodEntry = { mood: string; energy?: number | null; note?: string; ts: number };

const MOOD: Record<string, { label: string; symbol: string; bar: string; dot: string }> = {
  great: { label: "GREAT", symbol: "⚡", bar: "bg-accent-400/70",  dot: "border-accent-400/60 bg-accent-400/20" },
  good:  { label: "GOOD",  symbol: "✓",  bar: "bg-accent-400/45",  dot: "border-accent-400/40 bg-accent-400/10" },
  okay:  { label: "OKAY",  symbol: "—",  bar: "bg-white/25",       dot: "border-white/20 bg-white/05" },
  low:   { label: "LOW",   symbol: "↓",  bar: "bg-amber-400/50",   dot: "border-amber-400/40 bg-amber-400/10" },
  bad:   { label: "BAD",   symbol: "⚠",  bar: "bg-red-400/50",     dot: "border-red-400/40 bg-red-400/10" },
};

const TEXT: Record<string, string> = {
  great: "text-accent-300",
  good:  "text-accent-400/80",
  okay:  "text-white/60",
  low:   "text-amber-400/70",
  bad:   "text-red-400/70",
};

const KEY = "hud-mood-log";

function load(): MoodEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); }
  catch { return []; }
}

function save(entries: MoodEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries.slice(-30)));
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fmtDate(ts: number) {
  const d   = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "today";
  const yd = new Date(now); yd.setDate(now.getDate() - 1);
  if (d.toDateString() === yd.toDateString()) return "yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function MoodWidget() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);

  useEffect(() => { setEntries(load()); }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const entry = (e as CustomEvent).detail as MoodEntry;
      if (!entry?.mood) return;
      setEntries(prev => {
        const next = [...prev, { ...entry, ts: entry.ts ?? Date.now() }];
        save(next);
        return next;
      });
    };
    window.addEventListener("aria:mood_log", handler);
    return () => window.removeEventListener("aria:mood_log", handler);
  }, []);

  const latest = entries.length > 0 ? entries[entries.length - 1] : null;
  const recent = entries.slice(-8);
  const cfg    = latest ? MOOD[latest.mood] : null;

  return (
    <HudPanel title="MOOD LOG" icon={<Activity size={10} />}>
      <div className="space-y-3">
        {/* Current state */}
        {cfg && latest ? (
          <div className="flex items-center gap-3">
            <div className={`text-3xl font-mono leading-none ${TEXT[latest.mood]}`}>
              {cfg.symbol}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-[12px] font-bold tracking-[0.3em] font-mono ${TEXT[latest.mood]}`}>
                {cfg.label}
              </div>
              <div className="text-[7px] text-accent-400/25 tracking-widest mt-0.5">
                {fmtDate(latest.ts)} · {fmtTime(latest.ts)}
              </div>
              {latest.note && (
                <div className="text-[8px] text-white/40 italic mt-0.5 truncate">{latest.note}</div>
              )}
            </div>
            {/* Energy bars */}
            {latest.energy != null && latest.energy > 0 && (
              <div className="flex flex-col gap-0.5 items-end shrink-0">
                <div className="text-[6px] text-accent-400/20 tracking-widest uppercase">ENERGY</div>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(n => (
                    <div
                      key={n}
                      className={`w-2.5 h-1.5 ${n <= (latest.energy ?? 0) ? cfg.bar : "bg-accent-400/08"}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[8px] text-accent-400/20 tracking-widest leading-relaxed">
            Tell ARIA how you're feeling and it will log it here.
          </div>
        )}

        {/* History dots */}
        {recent.length > 0 && (
          <div className="flex items-center gap-1 pt-2 border-t border-accent-500/10">
            <span className="text-[6px] text-accent-400/15 tracking-widest uppercase mr-1 shrink-0">HISTORY</span>
            <div className="flex gap-1 flex-wrap">
              {recent.map((entry, i) => {
                const m = MOOD[entry.mood];
                return (
                  <div
                    key={i}
                    title={`${m?.label ?? entry.mood} — ${fmtDate(entry.ts)} ${fmtTime(entry.ts)}`}
                    className={`w-3 h-3 rounded-sm border ${m?.dot ?? "border-accent-400/20"} cursor-default`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </HudPanel>
  );
}
