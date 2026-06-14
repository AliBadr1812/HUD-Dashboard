"use client";

import Clock from "./components/Clock";
import Weather from "./components/Weather";
import HabitTracker from "./components/HabitTracker";
import Finance from "./components/Finance";
import News from "./components/News";
import CalendarWidget from "./components/CalendarWidget";
import PrayerTimes from "./components/PrayerTimes";
import SystemMonitor from "./components/SystemMonitor";
import Transport from "./components/Transport";
import GitHubActivity from "./components/GitHubActivity";
import SpotifyNowPlaying from "./components/SpotifyNowPlaying";
import HudBackdrop from "./components/HudBackdrop";
import HeaderSettings from "./components/HeaderSettings";
import Pomodoro from "./components/Pomodoro";
import Scratchpad from "./components/Scratchpad";
import MoodWidget from "./components/MoodWidget";
import CommandPalette from "./components/CommandPalette";
import dynamic from "next/dynamic";
const DraggableLayout = dynamic(() => import("./components/DraggableLayout"), { ssr: false });
import AriaModal from "./components/AriaModal";
import { useSettings } from "./context/SettingsContext";

export default function Home() {
  const { settings } = useSettings();
  const m = settings.modules;

  const widgets: Record<string, React.ReactNode> = {
    clock:      <Clock />,
    pomodoro:   <Pomodoro />,
    system:     <SystemMonitor />,
    prayer:     <PrayerTimes />,
    weather:    <Weather />,
    spotify:    <SpotifyNowPlaying />,
    news:       <News />,
    github:     <GitHubActivity />,
    transport:  <Transport />,
    missions:   <HabitTracker />,
    calendar:   <CalendarWidget />,
    finance:    <Finance />,
    scratchpad: <Scratchpad />,
    mood:       <MoodWidget />,
  };

  const visibleIds = new Set(
    Object.entries(m)
      .filter(([, on]) => on)
      .map(([id]) => id)
  );

  return (
    <main className="min-h-screen bg-[#080e14] p-6">
      <HudBackdrop />
      <CommandPalette />

      {/* Header bar */}
      <div className="border-b border-accent-500/25 pb-3 mb-5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-accent-400/50 tracking-[0.35em] uppercase">
            HUD Dashboard v1.0
          </span>
          <span className="text-accent-500/20 text-xs">|</span>
          <span className="text-[9px] text-accent-400/30 tracking-widest">PERSONAL COMMAND CENTER</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
            <span className="text-[9px] text-accent-400/50 tracking-[0.2em] uppercase">
              All Systems Nominal
            </span>
          </div>
          <AriaModal />
          <HeaderSettings />
        </div>
      </div>

      {/* Draggable widget grid */}
      <DraggableLayout widgets={widgets} visibleIds={visibleIds} />

      {/* Footer */}
      <div className="border-t border-accent-500/15 mt-4 pt-3 flex justify-between">
        <span className="text-[9px] text-accent-400/25 tracking-widest">
          WEATHER · NEWS · PRAYER TIMES — LIVE
        </span>
        <span className="text-[9px] text-accent-400/25 tracking-widest">
          ⌘K COMMAND PALETTE · NEXT.JS 16 // TAILWIND 4
        </span>
      </div>
    </main>
  );
}
