const BASE = "https://api.github.com";

function ghHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    "User-Agent": "HUDDashboard/1.0",
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };
}

async function ensureLabel(repo: string, name: string, color: string) {
  const check = await fetch(`${BASE}/repos/${repo}/labels/${encodeURIComponent(name)}`, {
    headers: ghHeaders(),
  });
  if (check.ok) return;
  await fetch(`${BASE}/repos/${repo}/labels`, {
    method: "POST",
    headers: ghHeaders(),
    body: JSON.stringify({ name, color, description: "" }),
  });
}

function mapIssue(i: any) {
  return {
    number: i.number,
    title: i.title,
    body: i.body ?? "",
    state: i.state,
    labels: i.labels.map((l: any) => ({ name: l.name, color: l.color })),
    url: i.html_url,
    createdAt: i.created_at,
    updatedAt: i.updated_at,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const repo = searchParams.get("repo");
  const h = ghHeaders();

  if (!repo) {
    const res = await fetch(`${BASE}/user/repos?sort=pushed&per_page=50&type=owner`, { headers: h });
    if (!res.ok) return Response.json({ error: "Failed to fetch repos" }, { status: res.status });
    const data = await res.json();
    return Response.json({
      repos: (Array.isArray(data) ? data : []).map((r: any) => ({
        name: r.name,
        fullName: r.full_name,
        private: r.private,
      })),
    });
  }

  const [openRes, closedRes] = await Promise.all([
    fetch(`${BASE}/repos/${repo}/issues?state=open&per_page=50&sort=created&direction=desc`, { headers: h }),
    fetch(`${BASE}/repos/${repo}/issues?state=closed&per_page=12&sort=updated&direction=desc`, { headers: h }),
  ]);

  if (!openRes.ok) return Response.json({ error: "Failed to fetch issues" }, { status: openRes.status });

  const [openData, closedData] = await Promise.all([openRes.json(), closedRes.json()]);

  const open = (Array.isArray(openData) ? openData : [])
    .filter((i: any) => !i.pull_request)
    .map(mapIssue);
  const closed = (Array.isArray(closedData) ? closedData : [])
    .filter((i: any) => !i.pull_request)
    .map(mapIssue);

  return Response.json({ open, closed });
}

export async function POST(req: Request) {
  const { repo, title, body = "", labels = [] } = await req.json();
  if (!repo || !title) return Response.json({ error: "repo and title required" }, { status: 400 });

  if ((labels as string[]).includes("in-progress")) {
    await ensureLabel(repo, "in-progress", "0075ca");
  }

  const res = await fetch(`${BASE}/repos/${repo}/issues`, {
    method: "POST",
    headers: ghHeaders(),
    body: JSON.stringify({ title, body, labels }),
  });
  const data = await res.json();
  if (!res.ok) return Response.json({ error: data.message }, { status: res.status });
  return Response.json(mapIssue(data));
}

export async function PATCH(req: Request) {
  const { repo, number, labels, ...rest } = await req.json();
  if (!repo || !number) return Response.json({ error: "repo and number required" }, { status: 400 });

  if (Array.isArray(labels) && (labels as string[]).includes("in-progress")) {
    await ensureLabel(repo, "in-progress", "0075ca");
  }

  const payload: Record<string, unknown> = { ...rest };
  if (labels !== undefined) payload.labels = labels;

  const res = await fetch(`${BASE}/repos/${repo}/issues/${number}`, {
    method: "PATCH",
    headers: ghHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) return Response.json({ error: data.message }, { status: res.status });
  return Response.json(mapIssue(data));
}
