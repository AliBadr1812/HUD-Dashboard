"use client";

import { useEffect, useState } from "react";
import { Clock as ClockIcon } from "lucide-react";
import HudPanel from "./HudPanel";
import { useSettings } from "../context/SettingsContext";

export default function Clock() {
  const [time, setTime] = useState<Date | null>(null);
  const { settings } = useSettings();
  const { clockFormat, showSeconds, showHijri } = settings;

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) {
    return (
      <HudPanel title="SYSTEM TIME" icon={<ClockIcon size={10} />}>
        <div className="text-5xl font-bold text-accent-300 tracking-widest">--:--</div>
      </HudPanel>
    );
  }

  let hh: string;
  let suffix = "";
  if (clockFormat === "12h") {
    const h12 = time.getHours() % 12 || 12;
    hh = h12.toString().padStart(2, "0");
    suffix = time.getHours() < 12 ? " AM" : " PM";
  } else {
    hh = time.getHours().toString().padStart(2, "0");
  }
  const mm = time.getMinutes().toString().padStart(2, "0");
  const ss = time.getSeconds().toString().padStart(2, "0");

  const dateStr = time.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const hijriStr = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(time);

  return (
    <HudPanel title="SYSTEM TIME" icon={<ClockIcon size={10} />}>
      <div>
        <div className="text-3xl lg:text-4xl xl:text-5xl font-bold text-accent-300 tracking-wider leading-none">
          {hh}:{mm}
          {showSeconds && <span className="text-accent-400/50">:{ss}</span>}
          {suffix && <span className="text-accent-400/60 text-2xl ml-1">{suffix}</span>}
          <span className="cursor-blink text-accent-400 ml-1">▮</span>
        </div>
        <div className="text-[10px] xl:text-xs text-accent-400/50 tracking-widest uppercase mt-3">
          {dateStr}
        </div>
        {showHijri && (
          <div className="text-[10px] xl:text-xs text-accent-400/35 tracking-wider mt-1">
            ◈ {hijriStr} AH
          </div>
        )}
      </div>
    </HudPanel>
  );
}
