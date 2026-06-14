"use client";

import { useEffect, useState } from "react";
import { Cloud, Droplets, Wind, Sun, ArrowUpRight } from "lucide-react";
import HudPanel from "./HudPanel";
import HudModal from "./HudModal";
import { useHudShortcut } from "../hooks/useHudShortcut";

type WeatherData = {
  temp: number;
  feelsLike?: number;
  tempMin?: number;
  tempMax?: number;
  condition: string;
  humidity: number;
  wind: number;
  windDir?: string;
  pressure?: number;
  visibility?: number;
  cloudCover?: number;
  uv: string;
  sunrise?: string;
  sunset?: string;
  forecast: { day: string; temp: number; icon: string }[];
  hourly?: { time: string; temp: number; icon: string; rain: number }[];
};

const MOCK: WeatherData = {
  temp: 22,
  condition: "Mostly Clear",
  humidity: 61,
  wind: 14,
  uv: "Low",
  forecast: [
    { day: "MON", temp: 18, icon: "○" },
    { day: "TUE", temp: 21, icon: "◑" },
    { day: "WED", temp: 19, icon: "◕" },
    { day: "THU", temp: 17, icon: "●" },
    { day: "FRI", temp: 16, icon: "●" },
    { day: "SAT", temp: 20, icon: "○" },
    { day: "SUN", temp: 23, icon: "○" },
  ],
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[7px] text-accent-400/30 tracking-[0.2em] uppercase">{label}</span>
      <span className="text-[11px] text-white/80 font-mono">{value}</span>
    </div>
  );
}

function WeatherModal({ data }: { data: WeatherData }) {
  return (
    <div className="space-y-4">
      {/* Current conditions header */}
      <div className="flex items-end justify-between pb-3 border-b border-accent-500/10">
        <div>
          <div className="flex items-end gap-2 mb-1">
            <span className="text-5xl font-bold text-white leading-none">{data.temp}°</span>
            <span className="text-lg text-accent-400/60 mb-1">C</span>
            {data.feelsLike !== undefined && (
              <span className="text-[10px] text-accent-400/40 mb-1.5">feels {data.feelsLike}°</span>
            )}
          </div>
          <div className="text-[10px] text-accent-400/70 tracking-widest uppercase">{data.condition}</div>
        </div>
        {(data.tempMin !== undefined && data.tempMax !== undefined) && (
          <div className="text-right">
            <div className="text-[9px] text-accent-400/30 tracking-widest mb-1">TODAY</div>
            <div className="text-[13px] text-white/70 font-mono">{data.tempMin}° – {data.tempMax}°</div>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 pb-3 border-b border-accent-500/10">
        <Stat label="Humidity" value={`${data.humidity}%`} />
        <Stat label="Wind" value={`${data.wind} km/h ${data.windDir ?? ""}`} />
        <Stat label="UV Index" value={data.uv} />
        {data.pressure !== undefined && <Stat label="Pressure" value={`${data.pressure} hPa`} />}
        {data.visibility !== undefined && <Stat label="Visibility" value={`${data.visibility} km`} />}
        {data.cloudCover !== undefined && <Stat label="Cloud Cover" value={`${data.cloudCover}%`} />}
      </div>

      {/* Hourly forecast */}
      {data.hourly && data.hourly.length > 0 && (
        <div className="pb-3 border-b border-accent-500/10">
          <div className="text-[8px] text-accent-400/30 tracking-[0.2em] uppercase mb-3">Next 24 Hours</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {data.hourly.map((h, i) => (
              <div key={i} className="flex flex-col items-center gap-1 shrink-0 min-w-[40px]">
                <span className="text-[8px] text-accent-400/40 font-mono">{h.time}</span>
                <span className="text-base text-accent-300">{h.icon}</span>
                <span className="text-[10px] text-white/70 font-mono">{h.temp}°</span>
                {h.rain > 0 && (
                  <span className="text-[7px] text-accent-400/40">{h.rain}%</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7-day forecast */}
      <div>
        <div className="text-[8px] text-accent-400/30 tracking-[0.2em] uppercase mb-3">7-Day Forecast</div>
        <div className="grid grid-cols-7 gap-1">
          {data.forecast.map(({ day, temp, icon }) => (
            <div key={day} className="flex flex-col items-center gap-1">
              <span className="text-[8px] text-accent-400/35 tracking-widest">{day}</span>
              <span className="text-base text-accent-300">{icon}</span>
              <span className="text-[10px] text-white/70">{temp}°</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sunrise / Sunset */}
      {(data.sunrise || data.sunset) && (
        <div className="flex items-center gap-6 pt-1 border-t border-accent-500/10">
          <div className="flex items-center gap-2">
            <Sun size={12} className="text-amber-400/50" />
            <div>
              <div className="text-[7px] text-accent-400/30 tracking-widest uppercase">Sunrise</div>
              <div className="text-[11px] text-white/70 font-mono">{data.sunrise}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Sun size={12} className="text-orange-400/40" />
            <div>
              <div className="text-[7px] text-accent-400/30 tracking-widest uppercase">Sunset</div>
              <div className="text-[11px] text-white/70 font-mono">{data.sunset}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Weather() {
  const [data, setData] = useState<WeatherData>(MOCK);
  const [live, setLive] = useState(false);
  const [expandOpen, setExpandOpen] = useState(false);
  useHudShortcut("hud:open-weather", () => setExpandOpen(true));

  useEffect(() => {
    fetch("/api/weather")
      .then((r) => r.json())
      .then((json) => {
        if (!json.error) { setData(json); setLive(true); }
      })
      .catch(() => {});
  }, []);

  const actions = (
    <button onClick={() => setExpandOpen(true)} className="text-accent-400/30 hover:text-accent-300 transition-colors p-0.5">
      <ArrowUpRight size={11} />
    </button>
  );

  return (
    <>
      <HudModal isOpen={expandOpen} onClose={() => setExpandOpen(false)} title="WEATHER — AMSTERDAM" width="420px">
        <WeatherModal data={data} />
      </HudModal>
      <HudPanel title="WEATHER // AMSTERDAM" icon={<Cloud size={10} />} actions={actions}>
        <div>
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-end gap-2">
              <span className="text-3xl xl:text-4xl font-bold text-white leading-none">{data.temp}°</span>
              <span className="text-sm text-accent-400/60 mb-1">C</span>
            </div>
            {live && <span className="text-[8px] text-accent-400/30 tracking-widest uppercase mt-1">LIVE</span>}
          </div>
          <div className="text-xs text-accent-400 tracking-widest uppercase">{data.condition}</div>
          <div className="flex gap-4 mt-3 text-[10px] text-accent-400/50">
            <span className="flex items-center gap-1"><Droplets size={11} className="text-accent-400/60" />{data.humidity}%</span>
            <span className="flex items-center gap-1"><Wind size={11} className="text-accent-400/60" />{data.wind}km/h</span>
            <span className="flex items-center gap-1"><Sun size={11} className="text-accent-400/60" />UV {data.uv}</span>
          </div>
          <div className="flex justify-between mt-4 pt-3 border-t border-accent-500/20">
            {data.forecast.map(({ day, temp, icon }, i) => (
              <div key={day} className={`flex flex-col items-center gap-1 ${i >= 5 ? "hidden 2xl:flex" : ""}`}>
                <span className="text-[9px] text-accent-400/40 tracking-widest">{day}</span>
                <span className="text-accent-300 text-base">{icon}</span>
                <span className="text-xs text-white">{temp}°</span>
              </div>
            ))}
          </div>
        </div>
      </HudPanel>
    </>
  );
}
