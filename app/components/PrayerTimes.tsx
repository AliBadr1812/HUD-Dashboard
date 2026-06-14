"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, Sunrise, Sun, Sunset, Bell, BellOff } from "lucide-react";
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
// Sunrise is not a prayer we notify for
const NOTIF_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;

function loadNotifPrefs() {
  if (typeof window === "undefined") return { enabled: false, lead: 10 };
  try { return JSON.parse(localStorage.getItem("hud-prayer-notif") ?? "null") ?? { enabled: false, lead: 10 }; }
  catch { return { enabled: false, lead: 10 }; }
}

export default function PrayerTimes() {
  const [prayers, setPrayers]     = useState<PrayerEntry[]>([]);
  const [nextName, setNextName]   = useState("");
  const [countdown, setCountdown] = useState("");
  const [live, setLive]           = useState(false);
  const [timings, setTimings]     = useState<Record<string, string> | null>(null);
  const [notifOn, setNotifOn]     = useState(false);
  const [notifLead]               = useState(10); // minutes before
  const notifTimers               = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Load notification preference
  useEffect(() => {
    const { enabled } = loadNotifPrefs();
    setNotifOn(enabled);
  }, []);

  // Schedule notifications whenever timings or toggle changes
  useEffect(() => {
    notifTimers.current.forEach(clearTimeout);
    notifTimers.current = [];
    if (!notifOn || !timings) return;
    if (typeof window === "undefined" || Notification.permission !== "granted") return;

    const today = new Date();
    const now   = Date.now();
    const lead  = notifLead * 60_000;

    for (const key of NOTIF_KEYS) {
      const timeStr = timings[key];
      if (!timeStr) continue;
      const pDate = parseTime(timeStr, today);
      const pMs   = pDate.getTime();

      // Lead-time notification
      const leadMs = pMs - lead;
      if (leadMs > now) {
        notifTimers.current.push(
          setTimeout(() => {
            new Notification(`🕌 ${PRAYER_LABELS[key]} in ${notifLead} min`, {
              body: `Prayer time at ${pDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}`,
              tag: `prayer-lead-${key}`,
            });
          }, leadMs - now)
        );
      }

      // At-time notification
      if (pMs > now) {
        notifTimers.current.push(
          setTimeout(() => {
            new Notification(`🕌 ${PRAYER_LABELS[key]}`, {
              body: "It is now time for prayer. May Allah accept.",
              tag: `prayer-${key}`,
            });
          }, pMs - now)
        );
      }
    }

    return () => {
      notifTimers.current.forEach(clearTimeout);
      notifTimers.current = [];
    };
  }, [notifOn, timings, notifLead]);

  useEffect(() => {
    let currentTimings: Record<string, string> | null = null;

    const compute = () => {
      if (!currentTimings) return;
      const now   = new Date();
      const today = new Date(now);

      const list = PRAYER_KEYS.map(key => ({
        key,
        label: PRAYER_LABELS[key],
        date:  parseTime(currentTimings![key], today),
        icon:  ICONS[PRAYER_LABELS[key]],
      }));

      let currentIdx = -1;
      for (let i = 0; i < list.length; i++) {
        if (list[i].date <= now) currentIdx = i;
      }

      const nextIdx = list.findIndex(p => p.date > now);
      if (nextIdx !== -1) {
        setNextName(list[nextIdx].label);
        setCountdown(fmtCountdown(list[nextIdx].date.getTime() - now.getTime()));
      } else {
        setNextName("Fajr");
        setCountdown("tomorrow");
      }

      setPrayers(
        list.map((p, i) => ({
          name:     p.label,
          time:     p.date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
          isActive: i === currentIdx,
          isPassed: p.date < now && i !== currentIdx,
          icon:     p.icon,
        }))
      );
    };

    const load = async () => {
      try {
        const res = await fetch("/api/prayer");
        if (!res.ok) return;
        currentTimings = await res.json();
        setTimings(currentTimings);
        setLive(true);
        compute();
      } catch {}
    };

    load();
    const refreshInterval = setInterval(load, 60 * 60 * 1000);
    const tickInterval    = setInterval(compute, 60_000);
    return () => { clearInterval(refreshInterval); clearInterval(tickInterval); };
  }, []);

  const toggleNotif = async () => {
    if (!notifOn) {
      let perm = Notification.permission;
      if (perm === "default") perm = await Notification.requestPermission();
      if (perm !== "granted") return;
    }
    const next = !notifOn;
    setNotifOn(next);
    localStorage.setItem("hud-prayer-notif", JSON.stringify({ enabled: next, lead: notifLead }));
  };

  const actions = (
    <button
      onClick={toggleNotif}
      title={notifOn ? "Adhan notifications on" : "Enable Adhan notifications"}
      className={`p-0.5 transition-colors ${notifOn ? "text-accent-300" : "text-accent-400/25 hover:text-accent-400/60"}`}
    >
      {notifOn ? <Bell size={11} /> : <BellOff size={11} />}
    </button>
  );

  return (
    <HudPanel title="PRAYER TIMES // AMS" icon={<Moon size={10} />} actions={actions}>
      <div>
        <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-accent-500/15">
          {nextName ? (
            <>
              <span className="text-[9px] text-accent-400/50 tracking-widest uppercase">
                Next: {nextName}
              </span>
              <span className="text-[10px] text-accent-300 font-bold tracking-widest">{countdown}</span>
            </>
          ) : (
            <span className="text-[9px] text-accent-400/30 tracking-widest">Loading…</span>
          )}
          {live && <span className="text-[8px] text-accent-400/30 tracking-widest uppercase ml-2">LIVE</span>}
        </div>

        <div className="space-y-1.5">
          {prayers.map(p => (
            <div
              key={p.name}
              className={`flex items-center gap-2.5 px-2 py-1.5 transition-all ${
                p.isActive ? "bg-accent-400/10 border border-accent-400/30" : "border border-transparent"
              }`}
            >
              <span className={`flex-shrink-0 ${p.isActive ? "text-accent-300" : p.isPassed ? "text-accent-600/30" : "text-accent-500/50"}`}>
                {p.icon}
              </span>
              <span className={`text-xs flex-1 tracking-wider ${p.isActive ? "text-accent-200 font-bold" : p.isPassed ? "text-accent-600/40" : "text-white/70"}`}>
                {p.name}
              </span>
              <span className={`text-xs font-mono tabular-nums ${p.isActive ? "text-accent-300 font-bold" : p.isPassed ? "text-accent-600/40" : "text-white/60"}`}>
                {p.time}
              </span>
            </div>
          ))}
        </div>

        {notifOn && (
          <div className="mt-2.5 pt-2 border-t border-accent-500/10 flex items-center gap-1.5">
            <Bell size={8} className="text-accent-400/30" />
            <span className="text-[7px] text-accent-400/25 tracking-widest">
              NOTIFYING {notifLead}MIN BEFORE + AT TIME
            </span>
          </div>
        )}
      </div>
    </HudPanel>
  );
}
