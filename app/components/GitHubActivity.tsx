"use client";

import { useEffect, useState } from "react";
import {
  GitGraph, Eye, Plus, Lock, Star, GitPullRequest, GitCommit,
  ChevronRight, ChevronLeft, X, Check, RefreshCw,
} from "lucide-react";
import { useHudShortcut } from "../hooks/useHudShortcut";
import HudPanel from "./HudPanel";
import HudModal from "./HudModal";

// ── Shared types ───────────────────────────────────────────────────────────────

type Week = { contributionDays: { date: string; contributionCount: number }[] };
type GHData = { username: string; total: number; streak: number; todayCount: number; weeks: Week[] };

type Repo     = { name: string; fullName: string; url: string; language: string | null; stars: number; openIssues: number; pushedAt: string; private: boolean };
type PR       = { number: number; title: string; repo: string; url: string; createdAt: string; draft: boolean };
type Push     = { repo: string; branch: string; commitCount: number; message: string; createdAt: string };
type IssueLabel = { name: string; color: string };
type Issue    = { number: number; title: string; body: string; state: string; labels: IssueLabel[]; url: string; createdAt: string; updatedAt: string };

// ── Helpers ────────────────────────────────────────────────────────────────────

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5",
  Rust: "#dea584", Go: "#00ADD8", Java: "#b07219", CSS: "#563d7c",
  HTML: "#e34c26", "C#": "#178600", "C++": "#f34b7d", Ruby: "#701516",
  Vue: "#41b883", Svelte: "#ff3e00", Shell: "#89e051",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Heatmap helpers ────────────────────────────────────────────────────────────

function makeMockWeeks(): Week[] {
  return Array.from({ length: 16 }, () => ({
    contributionDays: Array.from({ length: 7 }, () => ({
      date: "",
      contributionCount: Math.random() > 0.4 ? Math.floor(Math.random() * 8) : 0,
    })),
  }));
}

const EMPTY_WEEKS: Week[] = Array.from({ length: 16 }, () => ({
  contributionDays: Array.from({ length: 7 }, () => ({ date: "", contributionCount: 0 })),
}));

function cellColor(count: number): string {
  if (count === 0) return "bg-accent-500/8";
  if (count <= 2) return "bg-accent-600/40";
  if (count <= 5) return "bg-accent-400/65";
  return "bg-accent-300";
}

// ── Overview modal ─────────────────────────────────────────────────────────────

type OverviewTab = "repos" | "prs" | "activity";

function OverviewContent() {
  const [tab, setTab] = useState<OverviewTab>("repos");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [prs, setPrs] = useState<PR[]>([]);
  const [pushes, setPushes] = useState<Push[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/github/overview")
      .then((r) => r.json())
      .then((d) => {
        setRepos(d.repos ?? []);
        setPrs(d.prs ?? []);
        setPushes(d.pushes ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const TABS: { id: OverviewTab; label: string }[] = [
    { id: "repos", label: "Repositories" },
    { id: "prs", label: "Pull Requests" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <div className="-m-4">
      {/* Tab bar */}
      <div className="flex border-b border-accent-500/10">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-[8px] tracking-[0.2em] uppercase transition-colors border-b-2 ${
              tab === id
                ? "text-accent-400/80 border-accent-400/50"
                : "text-accent-400/25 border-transparent hover:text-accent-400/50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: "60vh" }}>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <span className="text-[8px] tracking-[0.3em] text-accent-400/20 animate-pulse uppercase">Loading...</span>
          </div>
        )}

        {/* Repositories */}
        {tab === "repos" && !loading && (
          <div className="p-3 grid grid-cols-2 gap-2">
            {repos.map((r) => (
              <a
                key={r.fullName}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2.5 border border-accent-500/10 hover:border-accent-500/30 hover:bg-accent-500/5 transition-colors group"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  {r.private && <Lock size={8} className="text-accent-400/30 shrink-0" />}
                  <span className="text-[10px] text-white/70 truncate group-hover:text-white/90 transition-colors leading-tight">
                    {r.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {r.language && (
                    <div className="flex items-center gap-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: LANG_COLORS[r.language] ?? "#888" }}
                      />
                      <span className="text-[8px] text-accent-400/40">{r.language}</span>
                    </div>
                  )}
                  {r.stars > 0 && (
                    <div className="flex items-center gap-0.5">
                      <Star size={8} className="text-accent-400/25" />
                      <span className="text-[8px] text-accent-400/30">{r.stars}</span>
                    </div>
                  )}
                  <span className="text-[7px] text-accent-400/20 ml-auto">{timeAgo(r.pushedAt)}</span>
                </div>
              </a>
            ))}
            {repos.length === 0 && (
              <div className="col-span-2 text-center py-10 text-[8px] text-accent-400/20 tracking-widest uppercase">
                No repos found
              </div>
            )}
          </div>
        )}

        {/* Pull requests */}
        {tab === "prs" && !loading && (
          <div className="divide-y divide-accent-500/10">
            {prs.length === 0 && (
              <div className="text-center py-12 text-[8px] text-accent-400/20 tracking-widest uppercase">
                No open pull requests
              </div>
            )}
            {prs.map((pr) => (
              <a
                key={pr.url}
                href={pr.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 px-4 py-3 hover:bg-accent-500/5 transition-colors group"
              >
                <GitPullRequest
                  size={12}
                  className={`mt-0.5 shrink-0 ${pr.draft ? "text-accent-400/20" : "text-accent-400/50"}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] text-accent-400/35 font-mono">#{pr.number}</span>
                    {pr.draft && (
                      <span className="text-[7px] text-accent-400/25 border border-accent-500/20 px-1 tracking-widest">
                        DRAFT
                      </span>
                    )}
                    <span className="text-[7px] text-accent-400/20 ml-auto">{timeAgo(pr.createdAt)}</span>
                  </div>
                  <div className="text-[10px] text-white/70 group-hover:text-white/90 transition-colors leading-snug">
                    {pr.title}
                  </div>
                  <div className="text-[8px] text-accent-400/30 mt-0.5 truncate">{pr.repo}</div>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Activity */}
        {tab === "activity" && !loading && (
          <div className="divide-y divide-accent-500/10">
            {pushes.length === 0 && (
              <div className="text-center py-12 text-[8px] text-accent-400/20 tracking-widest uppercase">
                No recent activity
              </div>
            )}
            {pushes.map((p, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <GitCommit size={12} className="text-accent-400/40 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] text-accent-400/50 truncate">{p.repo}</span>
                    {p.branch && (
                      <span className="text-[8px] text-accent-400/20 shrink-0">→ {p.branch}</span>
                    )}
                    <span className="text-[7px] text-accent-400/20 ml-auto shrink-0">{timeAgo(p.createdAt)}</span>
                  </div>
                  <div className="text-[10px] text-white/60 leading-snug truncate">{p.message}</div>
                  {p.commitCount > 1 && (
                    <div className="text-[7px] text-accent-400/25 mt-0.5">{p.commitCount} commits</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Work Items modal ───────────────────────────────────────────────────────────

type KanbanCol = "backlog" | "in-progress" | "done";

const COL_META: Record<KanbanCol, { label: string; emptyText: string; color: string }> = {
  backlog:       { label: "BACKLOG",     emptyText: "No items",       color: "text-accent-400/50" },
  "in-progress": { label: "IN PROGRESS", emptyText: "Nothing active", color: "text-amber-400/60" },
  done:          { label: "DONE",        emptyText: "Nothing done yet", color: "text-emerald-400/60" },
};

function issueCol(issue: Issue): KanbanCol {
  if (issue.state === "closed") return "done";
  if (issue.labels.some((l) => l.name === "in-progress")) return "in-progress";
  return "backlog";
}

function IssueCard({
  issue,
  onMove,
  onMoveBack,
  onClose,
  onReopen,
  onSaveEdit,
}: {
  issue: Issue;
  onMove: () => void;
  onMoveBack: () => void;
  onClose: () => void;
  onReopen: () => void;
  onSaveEdit: (title: string, body: string) => Promise<void>;
}) {
  const col = issueCol(issue);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(issue.title);
  const [editBody, setEditBody] = useState(issue.body);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    await onSaveEdit(editTitle.trim(), editBody.trim());
    setSaving(false);
    setEditing(false);
  };

  const visibleLabels = issue.labels.filter((l) => l.name !== "in-progress");

  return (
    <div className="border border-accent-500/10 hover:border-accent-500/20 transition-colors p-2 bg-white/[0.01]">
      {editing ? (
        <div className="space-y-1.5">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="w-full bg-transparent border border-accent-500/20 text-[10px] text-white/80 px-2 py-1 focus:outline-none focus:border-accent-400/40"
            autoFocus
          />
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={3}
            placeholder="Description..."
            className="w-full bg-transparent border border-accent-500/20 text-[9px] text-accent-400/50 px-2 py-1 focus:outline-none focus:border-accent-400/40 resize-none placeholder:text-accent-400/15"
          />
          <div className="flex gap-1.5">
            <button
              onClick={save}
              disabled={saving || !editTitle.trim()}
              className="flex items-center gap-1 px-2 py-0.5 bg-accent-500/15 hover:bg-accent-500/25 text-accent-300 text-[8px] tracking-widest uppercase transition-colors disabled:opacity-40"
            >
              <Check size={8} />
              {saving ? "..." : "Save"}
            </button>
            <button
              onClick={() => { setEditing(false); setEditTitle(issue.title); setEditBody(issue.body); }}
              className="px-2 py-0.5 text-[8px] text-accent-400/30 hover:text-accent-400/60 tracking-widest uppercase transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-1.5 mb-1.5">
            <span className="text-[7px] text-accent-400/20 font-mono mt-px shrink-0">#{issue.number}</span>
            <span
              onClick={() => { setEditing(true); setEditTitle(issue.title); setEditBody(issue.body); }}
              className="text-[10px] text-white/72 leading-snug cursor-pointer hover:text-accent-300 transition-colors flex-1"
            >
              {issue.title}
            </span>
          </div>

          {visibleLabels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {visibleLabels.map((l) => (
                <span
                  key={l.name}
                  className="text-[7px] px-1 py-px tracking-wide"
                  style={{
                    background: `#${l.color}22`,
                    color: `#${l.color}`,
                    border: `1px solid #${l.color}44`,
                  }}
                >
                  {l.name}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-1">
            <span className="text-[7px] text-accent-400/20">{timeAgo(issue.updatedAt)}</span>
            <div className="flex gap-0.5">
              {col === "done" ? (
                <button
                  onClick={onReopen}
                  title="Reopen"
                  className="text-accent-400/20 hover:text-accent-300 transition-colors p-0.5"
                >
                  <ChevronLeft size={11} />
                </button>
              ) : (
                <>
                  {col === "in-progress" && (
                    <button
                      onClick={onMoveBack}
                      title="Move back to Backlog"
                      className="text-accent-400/15 hover:text-accent-400/50 transition-colors p-0.5"
                    >
                      <ChevronLeft size={11} />
                    </button>
                  )}
                  <button
                    onClick={onMove}
                    title={col === "backlog" ? "Start — move to In Progress" : "Complete — move to Done"}
                    className="text-accent-400/20 hover:text-accent-300 transition-colors p-0.5"
                  >
                    <ChevronRight size={11} />
                  </button>
                  <button
                    onClick={onClose}
                    title="Close issue"
                    className="text-accent-400/15 hover:text-red-400/60 transition-colors p-0.5"
                  >
                    <X size={11} />
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

type NewForm = { col: KanbanCol; title: string; body: string } | null;

function WorkItemsContent() {
  const [repoList, setRepoList] = useState<{ name: string; fullName: string }[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [newForm, setNewForm] = useState<NewForm>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/github/issues")
      .then((r) => r.json())
      .then((d) => {
        if (d.repos?.length) {
          setRepoList(d.repos);
          setSelectedRepo(d.repos[0].fullName);
        }
      });
  }, []);

  const loadIssues = (repo: string) => {
    if (!repo) return;
    setLoading(true);
    fetch(`/api/github/issues?repo=${encodeURIComponent(repo)}`)
      .then((r) => r.json())
      .then((d) => setIssues([...(d.open ?? []), ...(d.closed ?? [])]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!selectedRepo) return;
    const timer = window.setTimeout(() => loadIssues(selectedRepo), 0);
    return () => window.clearTimeout(timer);
  }, [selectedRepo]);

  const patch = async (number: number, update: Record<string, unknown>) => {
    const res = await fetch("/api/github/issues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo: selectedRepo, number, ...update }),
    });
    const updated = await res.json();
    if (!updated.error) setIssues((prev) => prev.map((i) => i.number === number ? updated : i));
  };

  const createIssue = async () => {
    if (!newForm || !newTitle.trim() || !selectedRepo) return;
    setSubmitting(true);
    const labels = newForm.col === "in-progress" ? ["in-progress"] : [];
    const res = await fetch("/api/github/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo: selectedRepo, title: newTitle.trim(), body: newBody.trim(), labels }),
    });
    const created = await res.json();
    if (!created.error) setIssues((prev) => [created, ...prev]);
    setNewForm(null);
    setNewTitle("");
    setNewBody("");
    setSubmitting(false);
  };

  const moveForward = (issue: Issue) => {
    const col = issueCol(issue);
    if (col === "backlog") {
      patch(issue.number, { labels: [...issue.labels.map((l) => l.name), "in-progress"] });
    } else if (col === "in-progress") {
      patch(issue.number, { state: "closed" });
    }
  };

  const moveBack = (issue: Issue) => {
    patch(issue.number, { labels: issue.labels.filter((l) => l.name !== "in-progress").map((l) => l.name) });
  };

  const closeIssue = (issue: Issue) => patch(issue.number, { state: "closed" });

  const reopenIssue = (issue: Issue) => {
    patch(issue.number, {
      state: "open",
      labels: issue.labels.filter((l) => l.name !== "in-progress").map((l) => l.name),
    });
  };

  const saveEdit = async (issue: Issue, title: string, body: string) => {
    await patch(issue.number, { title, body });
  };

  const COLS: KanbanCol[] = ["backlog", "in-progress", "done"];

  return (
    <div className="-m-4">
      {/* Repo picker */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-accent-500/10">
        <span className="text-[8px] text-accent-400/30 tracking-[0.2em] uppercase shrink-0">Repo</span>
        <select
          value={selectedRepo}
          onChange={(e) => setSelectedRepo(e.target.value)}
          className="flex-1 bg-[#0a1620] text-[9px] text-accent-400/70 border border-accent-500/20 px-2 py-1 focus:outline-none focus:border-accent-400/40 tracking-wider"
        >
          {repoList.map((r) => (
            <option key={r.fullName} value={r.fullName}>{r.fullName}</option>
          ))}
        </select>
        <button
          onClick={() => loadIssues(selectedRepo)}
          className="text-accent-400/25 hover:text-accent-300 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={11} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-[8px] tracking-[0.3em] text-accent-400/20 animate-pulse uppercase">Loading...</span>
        </div>
      ) : (
        <div className="grid grid-cols-3 divide-x divide-accent-500/10" style={{ minHeight: "55vh" }}>
          {COLS.map((col) => {
            const colIssues = issues.filter((i) => issueCol(i) === col);
            const meta = COL_META[col];
            return (
              <div key={col} className="flex flex-col min-h-0">
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-accent-500/10 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[8px] tracking-[0.18em] uppercase font-bold ${meta.color}`}>
                      {meta.label}
                    </span>
                    <span className="text-[7px] text-accent-400/20 font-mono">{colIssues.length}</span>
                  </div>
                  {col !== "done" && (
                    <button
                      onClick={() => { setNewForm({ col, title: "", body: "" }); setNewTitle(""); setNewBody(""); }}
                      className="text-accent-400/20 hover:text-accent-300 transition-colors"
                      title="New issue"
                    >
                      <Plus size={10} />
                    </button>
                  )}
                </div>

                {/* New issue inline form */}
                {newForm?.col === col && (
                  <div className="p-2 border-b border-accent-500/10 bg-accent-500/5 space-y-1.5 shrink-0">
                    <input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && createIssue()}
                      placeholder="Issue title..."
                      autoFocus
                      className="w-full bg-transparent border border-accent-500/20 text-[10px] text-white/80 px-2 py-1 focus:outline-none focus:border-accent-400/40 placeholder:text-accent-400/15"
                    />
                    <textarea
                      value={newBody}
                      onChange={(e) => setNewBody(e.target.value)}
                      rows={2}
                      placeholder="Description (optional)"
                      className="w-full bg-transparent border border-accent-500/20 text-[9px] text-accent-400/50 px-2 py-1 focus:outline-none focus:border-accent-400/40 resize-none placeholder:text-accent-400/15"
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={createIssue}
                        disabled={submitting || !newTitle.trim()}
                        className="flex items-center gap-1 px-2 py-0.5 bg-accent-500/15 hover:bg-accent-500/25 text-accent-300 text-[8px] tracking-widest uppercase transition-colors disabled:opacity-40"
                      >
                        <Check size={8} />
                        {submitting ? "..." : "Add"}
                      </button>
                      <button
                        onClick={() => setNewForm(null)}
                        className="px-2 py-0.5 text-[8px] text-accent-400/30 hover:text-accent-400/60 tracking-widest uppercase transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Issue cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {colIssues.map((issue) => (
                    <IssueCard
                      key={issue.number}
                      issue={issue}
                      onMove={() => moveForward(issue)}
                      onMoveBack={() => moveBack(issue)}
                      onClose={() => closeIssue(issue)}
                      onReopen={() => reopenIssue(issue)}
                      onSaveEdit={(title, body) => saveEdit(issue, title, body)}
                    />
                  ))}
                  {colIssues.length === 0 && (
                    <div className="text-center py-8 text-[7px] text-accent-400/15 tracking-widest uppercase">
                      {meta.emptyText}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────────

export default function GitHubActivity() {
  const [data, setData] = useState<GHData | null>(null);
  const [mockWeeks, setMockWeeks] = useState<Week[] | null>(null);
  const [error, setError] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  useHudShortcut("hud:open-github",      () => setViewOpen(true));
  useHudShortcut("hud:open-github-work", () => setAddOpen(true));

  useEffect(() => {
    const load = () =>
      fetch("/api/github")
        .then((r) => r.json())
        .then((d) => {
          if (d.error) { setError(true); setMockWeeks(makeMockWeeks()); return; }
          setData(d);
        })
        .catch(() => { setError(true); setMockWeeks(makeMockWeeks()); });

    load();
    const id = setInterval(load, 5 * 60_000);
    return () => clearInterval(id);
  }, []);

  const weeks = data?.weeks ?? mockWeeks ?? EMPTY_WEEKS;

  const actions = (
    <>
      <button
        onClick={() => setViewOpen(true)}
        className="text-accent-400/30 hover:text-accent-300 transition-colors p-0.5"
        title="Overview"
      >
        <Eye size={11} />
      </button>
      <button
        onClick={() => setAddOpen(true)}
        className="text-accent-400/30 hover:text-accent-300 transition-colors p-0.5"
        title="Work items"
      >
        <Plus size={11} />
      </button>
    </>
  );

  return (
    <>
      <HudModal isOpen={viewOpen} onClose={() => setViewOpen(false)} title="GITHUB — OVERVIEW" width="520px">
        <OverviewContent />
      </HudModal>

      <HudModal isOpen={addOpen} onClose={() => setAddOpen(false)} title="GITHUB — WORK ITEMS" width="680px">
        <WorkItemsContent />
      </HudModal>

      <HudPanel title="GITHUB ACTIVITY" icon={<GitGraph size={10} />} actions={actions}>
        {error && (
          <div className="text-[9px] text-amber-400/50 tracking-wider mb-3">
            Add GITHUB_TOKEN + GITHUB_USERNAME to .env.local
          </div>
        )}

        <div className="flex gap-4 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-accent-300 leading-none">{data ? data.streak : "—"}</div>
            <div className="text-[8px] text-accent-400/40 tracking-widest mt-0.5">STREAK</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-accent-300 leading-none">{data ? data.todayCount : "—"}</div>
            <div className="text-[8px] text-accent-400/40 tracking-widest mt-0.5">TODAY</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-accent-300 leading-none">{data ? data.total : "—"}</div>
            <div className="text-[8px] text-accent-400/40 tracking-widest mt-0.5">THIS YEAR</div>
          </div>
        </div>

        <div className="flex gap-0.5">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.contributionDays.map((day, di) => (
                <div
                  key={di}
                  title={day.date ? `${day.date}: ${day.contributionCount}` : undefined}
                  className={`w-2.5 h-2.5 rounded-sm ${cellColor(day.contributionCount)}`}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mt-2">
          <span className="text-[8px] text-accent-400/20 tracking-wider">16 WEEKS</span>
          {data && (
            <span className="text-[8px] text-accent-400/30 tracking-wider">@{data.username}</span>
          )}
        </div>
      </HudPanel>
    </>
  );
}
