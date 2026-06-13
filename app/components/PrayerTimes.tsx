"use client";

import { useEffect, useState } from "react";
import { Moon, Sunrise, Sun, Sunset } from "lucide-react";
import HudPanel from "./HudPanel";

type PrayerEntry = {
  name: string;
  time: string;
  isActive: boolean;
  isPassed: boolean;
  icon: React.ReactNode;
};

const ICONS: Record<string, React.ReactNode> = {
  Fajr:    <Sunrise size={11} />,
  Sunrise: <Sunrise size={11} />,
  Dhuhr:   <Sun size={11} />,
  Asr:     <Sun size={11} />,
  Maghrib: <Sunset size={11} />,
  Isha:    <Moon size={11} />,
};

// Parse "HH:MM" returned by Aladhan into a Date on the given calendar day
function parseTime(hhMm: string, base: Date): Date {
  const [h, m] = hhMm.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

function fmtCountdown(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const PRAYER_KEYS = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;
const PRAYER_LABELS: Record<string, string> = {
  fajr: "Fajr", sunrise: "Sunrise", dhuhr: "Dhuhr",
  asr: "Asr", maghrib: "Maghrib", isha: "Isha",
};

export default function PrayerTimes() {
  const [prayers, setPrayers] = useState<PrayerEntry[]>([]);
  const [nextName, setNextName] = useState("");
  const [countdown, setCountdown] = useState("");
  const [live, setLive] = useState(false);

  useEffect(() => {
    let timings: Record<string, string> | null = null;

    const compute = () => {
      if (!timings) return;
      const now = new Date();
      const today = new Date(now);

      const list = PRAYER_KEYS.map((key) => ({
        key,
        label: PRAYER_LABELS[key],
        date: parseTime(timings![key], today),
        icon: ICONS[PRAYER_LABELS[key]],
      }));

      // Current prayer = last one whose time has passed
      let currentIdx = -1;
      for (let i = 0; i < list.length; i++) {
        if (list[i].date <= now) currentIdx = i;
      }

      // Next prayer = first one still in the future
      const nextIdx = list.findIndex((p) => p.date > now);

      if (nextIdx !== -1) {
        setNextName(list[nextIdx].label);
        setCountdown(fmtCountdown(list[nextIdx].date.getTime() - now.getTime()));
      } else {
        // Past Isha — next is tomorrow's Fajr (no countdown without tomorrow's data)
        setNextName("Fajr");
        setCountdown("tomorrow");
      }

      setPrayers(
        list.map((p, i) => ({
          name: p.label,
          time: p.date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
          isActive: i === currentIdx,
          isPassed: p.date < now && i !== currentIdx,
          icon: p.icon,
        }))
      );
    };

    const load = async () => {
      try {
        const res = await fetch("/api/prayer");
        if (!res.ok) return;
        timings = await res.json();
        setLive(true);
        compute();
      } catch {
        // keep previous data
      }
    };

    load();
    // Refresh prayer data at midnight and re-compute every minute
    const refreshInterval = setInterval(load, 60 * 60 * 1000); // re-fetch hourly
    const tickInterval = setInterval(compute, 60_000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(tickInterval);
    };
  }, []);

  return (
    <HudPanel title="PRAYER TIMES // AMS" icon={<Moon size={10} />}>
      <div>
        <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-cyan-500/15">
          {nextName ? (
            <>
              <span className="text-[9px] text-cyan-400/50 tracking-widest uppercase">
                Next: {nextName}
              </span>
              <span className="text-[10px] text-cyan-300 font-bold tracking-widest">{countdown}</span>
            </>
          ) : (
            <span className="text-[9px] text-cyan-400/30 tracking-widest">Loading…</span>
          )}
          {live && (
            <span className="text-[8px] text-cyan-400/30 tracking-widest uppercase ml-2">LIVE</span>
          )}
        </div>

        <div className="space-y-1.5">
          {prayers.map((p) => (
            <div
              key={p.name}
              className={`flex items-center gap-2.5 px-2 py-1.5 transition-all ${
                p.isActive
                  ? "bg-cyan-400/10 border border-cyan-400/30"
                  : "border border-transparent"
              }`}
            >
              <span
                className={`flex-shrink-0 ${
                  p.isActive
                    ? "text-cyan-300"
                    : p.isPassed
                    ? "text-cyan-600/30"
                    : "text-cyan-500/50"
                }`}
              >
                {p.icon}
              </span>
              <span
                className={`text-xs flex-1 tracking-wider ${
                  p.isActive
                    ? "text-cyan-200 font-bold"
                    : p.isPassed
                    ? "text-cyan-600/40"
                    : "text-white/70"
                }`}
              >
                {p.name}
              </span>
              <span
                className={`text-xs font-mono tabular-nums ${
                  p.isActive
                    ? "text-cyan-300 font-bold"
                    : p.isPassed
                    ? "text-cyan-600/40"
                    : "text-white/60"
                }`}
              >
                {p.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </HudPanel>
  );
}
