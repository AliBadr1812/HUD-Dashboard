"use client";

import { useState } from "react";
import { Wallet, TrendingDown, ArrowUpRight, Pencil, Plus, X } from "lucide-react";
import HudPanel from "./HudPanel";
import HudModal from "./HudModal";

type Category = { name: string; amount: number };
type FinanceData = {
  balance: number;
  monthlyBudget: number;
  spent: number;
  savingsGoal: number;
  saved: number;
  categories: Category[];
  sparkline: number[];
};

const DEFAULT: FinanceData = {
  balance: 4281.50,
  monthlyBudget: 2000,
  spent: 1140,
  savingsGoal: 500,
  saved: 320,
  categories: [
    { name: "Food",          amount: 380 },
    { name: "Transport",     amount: 120 },
    { name: "Entertainment", amount: 240 },
    { name: "Utilities",     amount: 180 },
    { name: "Other",         amount: 220 },
  ],
  sparkline: [1800, 1650, 1900, 1400, 1600, 1200, 1500, 1140],
};

function loadFinance(): FinanceData {
  if (typeof window === "undefined") return DEFAULT;
  try { return JSON.parse(localStorage.getItem("hud-finance") ?? "null") ?? DEFAULT; }
  catch { return DEFAULT; }
}

function saveFinance(data: FinanceData) {
  localStorage.setItem("hud-finance", JSON.stringify(data));
}

// ── Edit modal ─────────────────────────────────────────────────────────────────

function EditModal({ data, onSave, onClose }: { data: FinanceData; onSave: (d: FinanceData) => void; onClose: () => void }) {
  const [balance, setBalance] = useState(String(data.balance));
  const [budget, setBudget] = useState(String(data.monthlyBudget));
  const [savings, setSavings] = useState(String(data.savingsGoal));
  const [saved, setSaved] = useState(String(data.saved));
  const [cats, setCats] = useState<Category[]>(data.categories);
  const [newCat, setNewCat] = useState("");
  const [newAmt, setNewAmt] = useState("");

  const addCat = () => {
    const amt = parseFloat(newAmt);
    if (!newCat.trim() || isNaN(amt)) return;
    setCats(prev => [...prev, { name: newCat.trim(), amount: amt }]);
    setNewCat(""); setNewAmt("");
  };

  const updateAmt = (i: number, val: string) => {
    const amt = parseFloat(val);
    if (isNaN(amt)) return;
    setCats(prev => prev.map((c, idx) => idx === i ? { ...c, amount: amt } : c));
  };

  const save = () => {
    const spent = cats.reduce((s, c) => s + c.amount, 0);
    const updated: FinanceData = {
      ...data,
      balance: parseFloat(balance) || data.balance,
      monthlyBudget: parseFloat(budget) || data.monthlyBudget,
      savingsGoal: parseFloat(savings) || data.savingsGoal,
      saved: parseFloat(saved) || data.saved,
      spent,
      categories: cats,
      sparkline: [...data.sparkline.slice(1), spent],
    };
    onSave(updated);
    saveFinance(updated);
    onClose();
  };

  const input = "w-full bg-transparent border border-cyan-500/15 text-[10px] text-white/80 px-2 py-1.5 focus:outline-none focus:border-cyan-400/40";

  return (
    <div className="space-y-4">
      {/* Overview fields */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Balance (€)", val: balance, set: setBalance },
          { label: "Monthly Budget (€)", val: budget, set: setBudget },
          { label: "Savings Goal (€)", val: savings, set: setSavings },
          { label: "Saved This Month (€)", val: saved, set: setSaved },
        ].map(({ label, val, set }) => (
          <div key={label}>
            <div className="text-[7px] text-cyan-400/30 tracking-[0.2em] uppercase mb-1">{label}</div>
            <input type="number" value={val} onChange={e => set(e.target.value)} className={input} />
          </div>
        ))}
      </div>

      {/* Categories */}
      <div className="border-t border-cyan-500/10 pt-3">
        <div className="text-[8px] text-cyan-400/30 tracking-[0.2em] uppercase mb-2">Spending Categories</div>
        <div className="space-y-1.5 max-h-40 overflow-y-auto mb-2">
          {cats.map((c, i) => (
            <div key={i} className="flex items-center gap-2 group">
              <span className="text-[9px] text-white/60 flex-1 truncate">{c.name}</span>
              <div className="flex items-center gap-1">
                <span className="text-[8px] text-cyan-400/30">€</span>
                <input
                  type="number"
                  defaultValue={c.amount}
                  onBlur={e => updateAmt(i, e.target.value)}
                  className="w-16 bg-transparent border border-cyan-500/15 text-[9px] text-white/70 px-1.5 py-0.5 focus:outline-none focus:border-cyan-400/40 text-right"
                />
              </div>
              <button onClick={() => setCats(prev => prev.filter((_, idx) => idx !== i))} className="text-cyan-400/0 group-hover:text-red-400/40 hover:!text-red-400 transition-colors">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Category name" className="flex-1 bg-transparent border border-cyan-500/15 text-[9px] text-white/70 px-2 py-1 focus:outline-none focus:border-cyan-400/40 placeholder:text-cyan-400/15" />
          <input type="number" value={newAmt} onChange={e => setNewAmt(e.target.value)} placeholder="€" className="w-16 bg-transparent border border-cyan-500/15 text-[9px] text-white/70 px-2 py-1 focus:outline-none focus:border-cyan-400/40 placeholder:text-cyan-400/15" />
          <button onClick={addCat} className="px-2 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 transition-colors"><Plus size={10} /></button>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button onClick={save} className="px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-[8px] tracking-widest uppercase transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  );
}

// ── Detail modal ───────────────────────────────────────────────────────────────

function DetailModal({ data }: { data: FinanceData }) {
  const { balance, monthlyBudget, spent, savingsGoal, saved, categories, sparkline } = data;
  const spentPct = Math.round((spent / monthlyBudget) * 100);
  const savedPct = Math.round((saved / savingsGoal) * 100);
  const remaining = monthlyBudget - spent;

  const chartH = 80;
  const chartW = 400;
  const maxVal = Math.max(...sparkline);
  const points = sparkline.map((v, i) => {
    const x = (i / (sparkline.length - 1)) * chartW;
    const y = chartH - Math.round((v / maxVal) * chartH);
    return `${x},${y}`;
  }).join(" ");

  const opacities = ["opacity-100","opacity-80","opacity-60","opacity-50","opacity-35","opacity-25"];

  return (
    <div className="space-y-4">
      {/* Balance + key stats */}
      <div className="grid grid-cols-3 gap-3 pb-4 border-b border-cyan-500/10">
        <div>
          <div className="text-[7px] text-cyan-400/30 tracking-[0.2em] uppercase mb-1">Balance</div>
          <div className="text-2xl font-bold text-white leading-none">€{balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
        </div>
        <div>
          <div className="text-[7px] text-cyan-400/30 tracking-[0.2em] uppercase mb-1">Remaining Budget</div>
          <div className={`text-xl font-bold leading-none ${remaining < 0 ? "text-red-400" : "text-emerald-400/80"}`}>€{remaining.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[7px] text-cyan-400/30 tracking-[0.2em] uppercase mb-1">Saved</div>
          <div className="text-xl font-bold text-cyan-300 leading-none">€{saved} <span className="text-[10px] text-cyan-400/40">/ €{savingsGoal}</span></div>
        </div>
      </div>

      {/* Spending trend chart */}
      <div>
        <div className="text-[8px] text-cyan-400/30 tracking-[0.2em] uppercase mb-2">Monthly Spending Trend</div>
        <svg width="100%" height={chartH + 4} viewBox={`0 0 ${chartW} ${chartH + 4}`} preserveAspectRatio="none">
          <polyline points={`0,${chartH} ${points} ${chartW},${chartH}`} fill="#00e5ff" fillOpacity="0.08" />
          <polyline points={points} fill="none" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <line x1="0" y1={chartH} x2={chartW} y2={chartH} stroke="#00e5ff" strokeWidth="0.5" strokeOpacity="0.2" />
        </svg>
      </div>

      {/* Budget + savings bars */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between text-[8px] text-cyan-400/40 mb-1.5">
            <span className="tracking-widest uppercase">Budget Used</span><span>{spentPct}%</span>
          </div>
          <div className="h-2 bg-cyan-900/30">
            <div className={`h-full transition-all ${spentPct > 90 ? "bg-red-400/70" : spentPct > 70 ? "bg-amber-400/70" : "bg-cyan-400/80"}`} style={{ width: `${Math.min(spentPct, 100)}%` }} />
          </div>
          <div className="flex justify-between text-[8px] text-cyan-400/25 mt-1">
            <span>€{spent} spent</span><span>€{monthlyBudget} budget</span>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[8px] text-cyan-400/40 mb-1.5">
            <span className="tracking-widest uppercase">Savings Goal</span><span>{savedPct}%</span>
          </div>
          <div className="h-2 bg-cyan-900/30">
            <div className="h-full bg-emerald-400/60" style={{ width: `${Math.min(savedPct, 100)}%` }} />
          </div>
          <div className="flex justify-between text-[8px] text-cyan-400/25 mt-1">
            <span>€{saved} saved</span><span>€{savingsGoal} goal</span>
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="border-t border-cyan-500/10 pt-3">
        <div className="text-[8px] text-cyan-400/30 tracking-[0.2em] uppercase mb-3">Breakdown</div>
        <div className="space-y-2">
          {categories.map((cat, i) => {
            const pct = Math.round((cat.amount / spent) * 100);
            return (
              <div key={cat.name}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-1.5 h-1.5 bg-cyan-400 shrink-0 ${opacities[i] ?? "opacity-20"}`} />
                  <span className="text-[9px] text-cyan-400/60 flex-1 tracking-wider uppercase">{cat.name}</span>
                  <span className="text-[9px] text-cyan-400/40 w-8 text-right">{pct}%</span>
                  <span className="text-[10px] text-white/80 w-12 text-right">€{cat.amount}</span>
                </div>
                <div className="h-0.5 bg-cyan-900/30 ml-3">
                  <div className={`h-full bg-cyan-400 ${opacities[i] ?? "opacity-20"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────────

export default function Finance() {
  const [finance, setFinance] = useState<FinanceData>(() => loadFinance());
  const [expandOpen, setExpandOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { balance, monthlyBudget, spent, savingsGoal, saved, categories, sparkline } = finance;
  const spentPct = Math.round((spent / monthlyBudget) * 100);
  const savedPct = Math.round((saved / savingsGoal) * 100);

  const chartH = 56;
  const chartW = 300;
  const maxVal = Math.max(...sparkline);
  const points = sparkline.map((v, i) => {
    const x = (i / (sparkline.length - 1)) * chartW;
    const y = chartH - Math.round((v / maxVal) * chartH);
    return `${x},${y}`;
  }).join(" ");

  const actions = (
    <>
      <button onClick={() => setEditOpen(true)} className="text-cyan-400/30 hover:text-cyan-300 transition-colors p-0.5"><Pencil size={11} /></button>
      <button onClick={() => setExpandOpen(true)} className="text-cyan-400/30 hover:text-cyan-300 transition-colors p-0.5"><ArrowUpRight size={11} /></button>
    </>
  );

  return (
    <>
      <HudModal isOpen={editOpen} onClose={() => setEditOpen(false)} title="FINANCE — EDIT" width="400px">
        <EditModal data={finance} onSave={setFinance} onClose={() => setEditOpen(false)} />
      </HudModal>
      <HudModal isOpen={expandOpen} onClose={() => setExpandOpen(false)} title="FINANCE — DETAIL" width="480px">
        <DetailModal data={finance} />
      </HudModal>

      <HudPanel title="FINANCE OVERVIEW" icon={<Wallet size={10} />} actions={actions}>
        <div className="space-y-4 2xl:space-y-0 2xl:grid 2xl:grid-cols-2 2xl:gap-5">
          <div>
            <div className="text-[9px] text-cyan-400/50 tracking-[0.2em] uppercase mb-1">Balance</div>
            <div className="text-2xl font-bold text-white leading-none mb-3">
              €{balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1 text-[9px] text-cyan-400/40 mb-1.5">
              <TrendingDown size={10} />
              <span className="tracking-widest uppercase">Spending trend</span>
            </div>
            <svg width="100%" height={chartH + 4} viewBox={`0 0 ${chartW} ${chartH + 4}`} preserveAspectRatio="none">
              <polyline points={points} fill="none" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              <polyline points={`0,${chartH} ${points} ${chartW},${chartH}`} fill="#00e5ff" fillOpacity="0.12" />
              <line x1="0" y1={chartH} x2={chartW} y2={chartH} stroke="#00e5ff" strokeWidth="0.5" strokeOpacity="0.3" />
            </svg>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[9px] text-cyan-400/50 tracking-[0.2em] uppercase mb-1.5">
                <span>Budget</span><span>{spentPct}%</span>
              </div>
              <div className="h-1.5 bg-cyan-900/30">
                <div className="h-full bg-cyan-400/80" style={{ width: `${spentPct}%` }} />
              </div>
              <div className="flex justify-between text-[9px] text-cyan-400/30 mt-1">
                <span>€{spent} spent</span><span>€{monthlyBudget - spent} left</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[9px] text-cyan-400/50 tracking-[0.2em] uppercase mb-1.5">
                <span>Savings</span><span>{savedPct}%</span>
              </div>
              <div className="h-1.5 bg-cyan-900/30">
                <div className="h-full bg-cyan-400/40" style={{ width: `${savedPct}%` }} />
              </div>
              <div className="flex justify-between text-[9px] text-cyan-400/30 mt-1">
                <span>€{saved} saved</span><span>€{savingsGoal - saved} to go</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-cyan-500/15 space-y-2">
            <div className="text-[9px] text-cyan-400/50 tracking-[0.2em] uppercase mb-2">Breakdown</div>
            {categories.map((cat, i) => {
              const pct = Math.round((cat.amount / spent) * 100);
              const opacities = ["opacity-100","opacity-80","opacity-60","opacity-45","opacity-30"];
              return (
                <div key={cat.name} className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 flex-shrink-0 bg-cyan-400 ${opacities[i]}`} />
                  <span className="text-[10px] text-cyan-400/60 flex-1 tracking-wider uppercase">{cat.name}</span>
                  <span className="text-[10px] text-cyan-400/40 w-6 text-right">{pct}%</span>
                  <span className="text-[11px] text-white/80 w-10 text-right">€{cat.amount}</span>
                </div>
              );
            })}
          </div>
        </div>
      </HudPanel>
    </>
  );
}
