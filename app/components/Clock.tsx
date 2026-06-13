"use client";

import { useEffect, useState } from "react";
import { Clock as ClockIcon } from "lucide-react";
import HudPanel from "./HudPanel";

export default function Clock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) {
    return (
      <HudPanel title="SYSTEM TIME" icon={<ClockIcon size={10} />}>
        <div className="text-5xl font-bold text-cyan-300 tracking-widest">--:--<span className="text-cyan-400/60">:--</span></div>
      </HudPanel>
    );
  }

  const hh = time.getHours().toString().padStart(2, "0");
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
        <div className="text-3xl lg:text-4xl xl:text-5xl font-bold text-cyan-300 tracking-wider leading-none">
          {hh}:{mm}
          <span className="text-cyan-400/50">:{ss}</span>
          <span className="cursor-blink text-cyan-400 ml-1">▮</span>
        </div>
        <div className="text-[10px] xl:text-xs text-cyan-400/50 tracking-widest uppercase mt-3">
          {dateStr}
        </div>
        <div className="text-[10px] xl:text-xs text-cyan-400/35 tracking-wider mt-1">
          ◈ {hijriStr} AH
        </div>
      </div>
    </HudPanel>
  );
}
