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

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080e14] p-6">
      <HudBackdrop />
      <div className="scanline" />

      {/* Header bar */}
      <div className="border-b border-cyan-500/25 pb-3 mb-5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-cyan-400/50 tracking-[0.35em] uppercase">
            HUD Dashboard v1.0
          </span>
          <span className="text-cyan-500/20 text-xs">|</span>
          <span className="text-[9px] text-cyan-400/30 tracking-widest">PERSONAL COMMAND CENTER</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[9px] text-cyan-400/50 tracking-[0.2em] uppercase">
              All Systems Nominal
            </span>
          </div>
          <HeaderSettings />
        </div>
      </div>

      {/* Three columns */}
      <div className="flex flex-col md:flex-row gap-4 items-start">

        {/* Left — system info */}
        <div className="flex flex-col gap-4 w-full md:w-56 lg:w-64 xl:w-72 2xl:w-80 shrink-0">
          <Clock />
          <SystemMonitor />
          <PrayerTimes />
          <Weather />
        </div>

        {/* Center — feeds */}
        <div className="flex flex-col gap-4 w-full md:flex-1 min-w-0 order-last md:order-none">
          <SpotifyNowPlaying />
          <News />
        </div>

        {/* Right — personal / transport / finance */}
        <div className="flex flex-col gap-4 w-full md:w-56 lg:w-64 xl:w-72 2xl:w-80 shrink-0">
          <GitHubActivity />
          <Transport />
          <HabitTracker />
          <CalendarWidget />
          <Finance />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-cyan-500/15 mt-4 pt-3 flex justify-between">
        <span className="text-[9px] text-cyan-400/25 tracking-widest">
          WEATHER · NEWS · PRAYER TIMES — LIVE
        </span>
        <span className="text-[9px] text-cyan-400/25 tracking-widest">
          NEXT.JS 16 // TAILWIND 4
        </span>
      </div>
    </main>
  );
}
