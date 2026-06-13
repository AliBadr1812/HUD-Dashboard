// components/transport.tsx
"use client";

import { useEffect, useState } from "react";
import { Train, Bus, ChevronDown } from "lucide-react";
import HudPanel from "./HudPanel";

type Departure = {
  dest: string;
  minutes: number;
  scheduled: string;
};

type RouteOption = {
  id: string;
  label: string;
  line: string;
  tpc: string;
  dest: string;
  type: "tram" | "bus";
};

const ROUTE_OPTIONS: RouteOption[] = [
  { id: "tram7", label: "GVB Tram 7 // Plantage Parklaan", line: "7", tpc: "30003176", dest: "Plantage Parklaan", type: "tram" },
  { id: "tram13", label: "GVB Tram 13 // Zoutkeetsgracht", line: "13", tpc: "30003091", dest: "Zoutkeetsgracht", type: "tram" },
  { id: "bus369", label: "GVB Bus 369 // Schiphol Airport", line: "369", tpc: "30003174", dest: "Schiphol", type: "bus" },
];

function formatMinutes(minutes: number): string {
  if (minutes <= 1) return "NOW";
  if (minutes < 60) return `${minutes}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function minuteUnit(minutes: number): string {
  if (minutes <= 1 || minutes >= 60) return "";
  return "min";
}

export default function Transport() {
  const [selectedRoute, setSelectedRoute] = useState<RouteOption>(ROUTE_OPTIONS[0]);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const load = () => {
      const params = new URLSearchParams({
        line: selectedRoute.line,
        tpc: selectedRoute.tpc,
        dest: selectedRoute.dest,
        type: selectedRoute.type
      });

      fetch(`/api/transport?${params.toString()}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.departures) {
            setDepartures(d.departures);
            setLive(d.live);
          }
        })
        .catch((err) => console.error("Widget fetch failed:", err));
    };

    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [selectedRoute]); // 

  // UI Re-render tick to synchronize counters
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Futuristic Header Dropdown Selector matching HudPanel layout patterns
  const TitleDropdown = (
    <div className="relative inline-flex items-center group">
      <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      {selectedRoute.type === "bus" ? (
        <Bus size={10} className="text-cyan-400 mr-1.5 animate-pulse" />
      ) : (
        <Train size={10} className="text-cyan-400 mr-1.5 animate-pulse" />
      )}
      <select
        value={selectedRoute.id}
        onChange={(e) => {
          const found = ROUTE_OPTIONS.find((opt) => opt.id === e.target.value);
          if (found) setDepartures([]); // Temporary loading flash state clean
          if (found) setSelectedRoute(found);
        }}
        className="appearance-none bg-transparent text-[10px] font-bold tracking-widest text-cyan-400 uppercase pr-5 cursor-pointer focus:outline-none selection:bg-slate-900 selection:text-cyan-300"
      >
        {ROUTE_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id} className="bg-neutral-950 text-cyan-400 text-[10px] font-mono">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown size={8} className="absolute right-0 text-cyan-400/50 pointer-events-none group-hover:text-cyan-400 transition-colors" />
    </div>
  );

  return (
    <HudPanel title={TitleDropdown} icon={null}>
      <div className="flex justify-between items-center mb-3 -mt-1">
        <span />
        {live ? (
          <span className="text-[8px] text-cyan-400/30 tracking-widest uppercase border-b border-cyan-400/20 px-1">LIVE FEED</span>
        ) : (
          <span className="text-[8px] text-amber-400/40 tracking-widest uppercase border-b border-amber-400/20 px-1">SCHED TIMELINE</span>
        )}
      </div>

      {departures.length === 0 ? (
        <div className="text-[10px] text-cyan-400/30 text-center py-2 animate-pulse tracking-wider font-mono">INITIALIZING HUD DATA…</div>
      ) : (
        <div className="space-y-2 font-mono">
          {departures.map((dep, i) => {
            const isNext = i === 0;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 border-l-2 py-0.5 pl-2 transition-colors ${
                  isNext 
                    ? "border-cyan-400 bg-cyan-500/5 text-white" 
                    : "border-transparent text-white/50 hover:bg-white/5"
                }`}
              >
                {/* Line badge */}
                <div
                  className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 border select-none ${
                    isNext
                      ? "border-cyan-400 text-cyan-300 bg-cyan-950/50"
                      : "border-cyan-500/20 text-cyan-500/40"
                  }`}
                >
                  {selectedRoute.line}
                </div>

                {/* Destination */}
                <span
                  className={`flex-1 text-[11px] tracking-wide truncate ${
                    isNext ? "text-white font-medium" : "text-white/40"
                  }`}
                >
                  {dep.dest}
                </span>

                {/* Time status matrix */}
                <div className="text-right shrink-0 pr-1">
                  <span
                    className={`text-[11px] font-bold ${
                      dep.minutes <= 1
                        ? "text-cyan-400 tracking-widest drop-shadow-[0_0_4px_rgba(34,211,238,0.4)]"
                        : isNext ? "text-cyan-300" : "text-cyan-500/40"
                    }`}
                  >
                    {formatMinutes(dep.minutes)}
                    {minuteUnit(dep.minutes) && (
                      <span className="text-[8px] font-normal ml-0.5 opacity-60">
                        {minuteUnit(dep.minutes)}
                      </span>
                    )}
                  </span>
                  <div className="text-[8px] text-cyan-400/25 tracking-tighter">{dep.scheduled}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </HudPanel>
  );
}
