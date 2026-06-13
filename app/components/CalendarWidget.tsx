"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ArrowUpRight, Plus, X } from "lucide-react";
import HudPanel from "./HudPanel";
import HudModal from "./HudModal";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

type CalEvent = { id: string; title: string; time: string };
type EventStore = Record<string, CalEvent[]>;

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function loadEvents(): EventStore {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem("hud-cal-events") ?? "{}"); }
  catch { return {}; }
}

function saveEvents(events: EventStore) {
  localStorage.setItem("hud-cal-events", JSON.stringify(events));
}

function MiniCalendar({
  viewDate, setViewDate, selectedDay, setSelectedDay, events, today,
}: {
  viewDate: Date; setViewDate: (d: Date) => void;
  selectedDay: number | null; setSelectedDay: (d: number) => void;
  events: EventStore; today: Date;
}) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const cells: (number | null)[] = [...Array(firstDayOfWeek).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="text-cyan-400/50 hover:text-cyan-300 transition-colors p-0.5"><ChevronLeft size={13} /></button>
        <span className="text-[10px] text-cyan-400/80 tracking-widest uppercase">{MONTHS[month]} {year}</span>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="text-cyan-400/50 hover:text-cyan-300 transition-colors p-0.5"><ChevronRight size={13} /></button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d, i) => <div key={i} className="text-center text-[9px] text-cyan-400/35 tracking-widest py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          const isToday = isCurrentMonth && day === today.getDate();
          const isSelected = day === selectedDay;
          const hasEvent = day ? (events[dateKey(year, month, day)]?.length ?? 0) > 0 : false;
          return (
            <div
              key={i}
              onClick={() => day && setSelectedDay(day)}
              className={`relative text-center py-1 text-[11px] leading-none transition-colors ${
                !day ? "" :
                isSelected ? "bg-cyan-400/25 text-cyan-200 font-bold border border-cyan-400/50 cursor-pointer" :
                isToday ? "bg-cyan-400/10 text-cyan-300 font-bold border border-cyan-400/30 cursor-pointer" :
                "text-white/55 hover:text-cyan-300 hover:bg-cyan-500/10 cursor-pointer"
              }`}
            >
              {day ?? ""}
              {hasEvent && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400/60" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarModal({ today }: { today: Date }) {
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [events, setEvents] = useState<EventStore>(() => loadEvents());
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const key = selectedDay ? dateKey(year, month, selectedDay) : null;
  const dayEvents = key ? (events[key] ?? []) : [];
  const selectedLabel = selectedDay ? `${MONTHS[month]} ${selectedDay}, ${year}` : null;

  const addEvent = () => {
    if (!newTitle.trim() || !key) return;
    const updated = { ...events, [key]: [...(events[key] ?? []), { id: Date.now().toString(), title: newTitle.trim(), time: newTime }] };
    setEvents(updated);
    saveEvents(updated);
    setNewTitle("");
    setNewTime("");
  };

  const removeEvent = (evId: string) => {
    if (!key) return;
    const updated = { ...events, [key]: (events[key] ?? []).filter(e => e.id !== evId) };
    setEvents(updated);
    saveEvents(updated);
  };

  return (
    <div className="grid grid-cols-[1fr_180px] gap-4" style={{ minHeight: "360px" }}>
      {/* Calendar */}
      <MiniCalendar viewDate={viewDate} setViewDate={setViewDate} selectedDay={selectedDay} setSelectedDay={setSelectedDay} events={events} today={today} />

      {/* Events panel */}
      <div className="border-l border-cyan-500/10 pl-4 flex flex-col gap-2">
        <div className="text-[8px] text-cyan-400/30 tracking-[0.2em] uppercase mb-1">
          {selectedLabel ?? "Select a day"}
        </div>

        {dayEvents.length === 0 && (
          <div className="text-[8px] text-cyan-400/15 tracking-widest uppercase py-2">No events</div>
        )}

        <div className="space-y-1.5 flex-1 overflow-y-auto">
          {dayEvents.map(ev => (
            <div key={ev.id} className="flex items-start gap-1.5 group">
              <div className="flex-1 min-w-0">
                {ev.time && <div className="text-[7px] text-cyan-400/30 font-mono mb-0.5">{ev.time}</div>}
                <div className="text-[9px] text-white/70 leading-snug">{ev.title}</div>
              </div>
              <button onClick={() => removeEvent(ev.id)} className="text-cyan-400/0 group-hover:text-red-400/50 hover:!text-red-400 transition-colors shrink-0 mt-0.5">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>

        {/* Add event */}
        {selectedDay && (
          <div className="border-t border-cyan-500/10 pt-2 space-y-1.5">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addEvent()}
              placeholder="Add event..."
              className="w-full bg-transparent border border-cyan-500/15 text-[9px] text-white/70 px-2 py-1 focus:outline-none focus:border-cyan-400/40 placeholder:text-cyan-400/15"
            />
            <div className="flex gap-1">
              <input
                type="time"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                className="flex-1 bg-transparent border border-cyan-500/15 text-[8px] text-cyan-400/50 px-2 py-1 focus:outline-none focus:border-cyan-400/40"
              />
              <button
                onClick={addEvent}
                disabled={!newTitle.trim()}
                className="px-2 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 transition-colors disabled:opacity-30"
              >
                <Plus size={10} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CalendarWidget() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<EventStore>(() => loadEvents());
  const [expandOpen, setExpandOpen] = useState(false);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = viewDate.toLocaleString("en-US", { month: "long", year: "numeric" });
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const cells: (number | null)[] = [...Array(firstDayOfWeek).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const actions = (
    <button onClick={() => setExpandOpen(true)} className="text-cyan-400/30 hover:text-cyan-300 transition-colors p-0.5">
      <ArrowUpRight size={11} />
    </button>
  );

  return (
    <>
      <HudModal isOpen={expandOpen} onClose={() => setExpandOpen(false)} title="CALENDAR — EVENTS" width="500px">
        <CalendarModal today={today} />
      </HudModal>
      <HudPanel title="CALENDAR" icon={<CalendarDays size={10} />} actions={actions}>
        <div>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="text-cyan-400/50 hover:text-cyan-300 transition-colors p-0.5"><ChevronLeft size={13} /></button>
            <span className="text-[10px] text-cyan-400/80 tracking-widest uppercase">{monthLabel}</span>
            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="text-cyan-400/50 hover:text-cyan-300 transition-colors p-0.5"><ChevronRight size={13} /></button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d, i) => <div key={i} className="text-center text-[9px] text-cyan-400/35 tracking-widest py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => {
              const isToday = isCurrentMonth && day === today.getDate();
              const hasEvent = day ? (events[dateKey(year, month, day)]?.length ?? 0) > 0 : false;
              return (
                <div key={i} className={`relative text-center py-1 text-[11px] leading-none ${
                  !day ? "" :
                  isToday ? "bg-cyan-400/20 text-cyan-300 font-bold border border-cyan-400/40" :
                  "text-white/55 hover:text-cyan-300 hover:bg-cyan-500/10 cursor-pointer transition-colors"
                }`}>
                  {day ?? ""}
                  {hasEvent && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400/60" />}
                </div>
              );
            })}
          </div>
        </div>
      </HudPanel>
    </>
  );
}
