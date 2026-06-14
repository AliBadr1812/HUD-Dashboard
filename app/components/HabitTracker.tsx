"use client";

import { useRef, useState, useEffect } from "react";
import { Target, Flame, Pencil, Plus, X, Check } from "lucide-react";
import HudPanel from "./HudPanel";
import HudModal from "./HudModal";
import { useHudShortcut } from "../hooks/useHudShortcut";

type Habit = { id: number; name: string; streak: number; done: boolean };

const DEFAULT_HABITS: Habit[] = [
  { id: 1, name: "Workout",     streak: 5,  done: false },
  { id: 2, name: "Reading",     streak: 12, done: true  },
  { id: 3, name: "Meditation",  streak: 3,  done: false },
  { id: 4, name: "Water (2L)",  streak: 21, done: true  },
  { id: 5, name: "Journal",     streak: 7,  done: false },
  { id: 6, name: "No junk food",streak: 4,  done: false },
];

function loadHabits(): Habit[] {
  if (typeof window === "undefined") return DEFAULT_HABITS;
  try { return JSON.parse(localStorage.getItem("hud-habits") ?? "null") ?? DEFAULT_HABITS; }
  catch { return DEFAULT_HABITS; }
}

function saveHabits(habits: Habit[]) {
  localStorage.setItem("hud-habits", JSON.stringify(habits));
}

function EditModal({ habits, setHabits, onClose }: { habits: Habit[]; setHabits: (h: Habit[]) => void; onClose: () => void }) {
  const [local, setLocal] = useState<Habit[]>(habits);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const nextId = useRef(Math.max(...habits.map(h => h.id), 0) + 1);

  const add = () => {
    if (!newName.trim()) return;
    const updated = [...local, { id: nextId.current++, name: newName.trim(), streak: 0, done: false }];
    setLocal(updated);
    setNewName("");
  };

  const remove = (id: number) => setLocal(prev => prev.filter(h => h.id !== id));

  const startEdit = (h: Habit) => { setEditingId(h.id); setEditName(h.name); };

  const saveEdit = (id: number) => {
    if (!editName.trim()) return;
    setLocal(prev => prev.map(h => h.id === id ? { ...h, name: editName.trim() } : h));
    setEditingId(null);
  };

  const save = () => {
    setHabits(local);
    saveHabits(local);
    onClose();
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {local.map(h => (
          <div key={h.id} className="flex items-center gap-2 group">
            {editingId === h.id ? (
              <>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveEdit(h.id); if (e.key === "Escape") setEditingId(null); }}
                  autoFocus
                  className="flex-1 bg-transparent border border-accent-500/20 text-[10px] text-white/80 px-2 py-1 focus:outline-none focus:border-accent-400/40"
                />
                <button onClick={() => saveEdit(h.id)} className="text-accent-300 hover:text-accent-200 transition-colors"><Check size={11} /></button>
                <button onClick={() => setEditingId(null)} className="text-accent-400/30 hover:text-accent-400/60 transition-colors"><X size={11} /></button>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1 text-[9px] text-accent-400/30 w-10 shrink-0">
                  <Flame size={9} className="text-accent-400/25" />{h.streak}
                </span>
                <span
                  onClick={() => startEdit(h)}
                  className="flex-1 text-[10px] text-white/70 cursor-pointer hover:text-accent-300 transition-colors truncate"
                >
                  {h.name}
                </span>
                <button onClick={() => remove(h.id)} className="text-accent-400/0 group-hover:text-red-400/40 hover:!text-red-400 transition-colors shrink-0">
                  <X size={11} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add new */}
      <div className="flex gap-1.5 pt-2 border-t border-accent-500/10">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder="New habit..."
          className="flex-1 bg-transparent border border-accent-500/15 text-[9px] text-white/70 px-2 py-1 focus:outline-none focus:border-accent-400/40 placeholder:text-accent-400/15"
        />
        <button onClick={add} disabled={!newName.trim()} className="px-2 py-1 bg-accent-500/15 hover:bg-accent-500/25 text-accent-300 transition-colors disabled:opacity-30">
          <Plus size={10} />
        </button>
      </div>

      <div className="flex justify-end pt-1">
        <button onClick={save} className="px-3 py-1.5 bg-accent-500/15 hover:bg-accent-500/25 text-accent-300 text-[8px] tracking-widest uppercase transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  );
}

export default function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>(() => loadHabits());
  const [editOpen, setEditOpen] = useState(false);
  useHudShortcut("hud:open-habits", () => setEditOpen(true));

  // ARIA tool: add a habit via CustomEvent
  useEffect(() => {
    const handler = (e: Event) => {
      const name = (e as CustomEvent).detail?.name;
      if (!name) return;
      setHabits(prev => {
        const next = [...prev, { id: Date.now(), name, streak: 0, done: false }];
        saveHabits(next);
        return next;
      });
    };
    window.addEventListener("aria:habit_add", handler);
    return () => window.removeEventListener("aria:habit_add", handler);
  }, []);

  const toggle = (id: number) => {
    const updated = habits.map(h => h.id === id ? { ...h, done: !h.done } : h);
    setHabits(updated);
    saveHabits(updated);
  };

  const completed = habits.filter(h => h.done).length;
  const total = habits.length;

  const actions = (
    <button onClick={() => setEditOpen(true)} className="text-accent-400/30 hover:text-accent-300 transition-colors p-0.5">
      <Pencil size={11} />
    </button>
  );

  return (
    <>
      <HudModal isOpen={editOpen} onClose={() => setEditOpen(false)} title="MISSIONS — MANAGE">
        <EditModal habits={habits} setHabits={setHabits} onClose={() => setEditOpen(false)} />
      </HudModal>
      <HudPanel title="DAILY MISSIONS" icon={<Target size={10} />} actions={actions}>
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-[9px] text-accent-400/50 tracking-widest">{completed}/{total} COMPLETE</span>
            <div className="flex gap-1">
              {habits.map(h => (
                <div key={h.id} className={`w-2 h-2 transition-colors ${h.done ? "bg-accent-400" : "bg-accent-900/60"}`} />
              ))}
            </div>
          </div>
          <div className="space-y-1">
            {habits.map(habit => (
              <button
                key={habit.id}
                onClick={() => toggle(habit.id)}
                className="w-full flex items-center gap-3 p-2 border border-transparent hover:border-accent-500/25 hover:bg-accent-500/5 transition-all text-left group"
              >
                <span className={`w-4 h-4 border flex items-center justify-center text-[10px] flex-shrink-0 transition-all ${
                  habit.done ? "border-accent-400 bg-accent-400/15 text-accent-300" : "border-accent-600/30 text-transparent group-hover:border-accent-500/50"
                }`}>✓</span>
                <span className={`text-xs flex-1 tracking-wider transition-all ${habit.done ? "text-accent-400/40 line-through" : "text-white/90"}`}>
                  {habit.name}
                </span>
                <span className="flex items-center gap-0.5 text-[9px] text-accent-600/50 whitespace-nowrap">
                  <Flame size={9} className="text-accent-600/40" />{habit.streak}
                </span>
              </button>
            ))}
          </div>
        </div>
      </HudPanel>
    </>
  );
}
