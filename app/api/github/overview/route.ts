const BASE = "https://api.github.com";

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  const username = process.env.GITHUB_USERNAME;
  if (!token || !username) return Response.json({ error: "Not configured" }, { status: 500 });

  const h = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "HUDDashboard/1.0",
    Accept: "application/vnd.github+json",
  };

  const [reposRes, prsRes, eventsRes] = await Promise.all([
    fetch(`${BASE}/user/repos?sort=pushed&per_page=8&type=owner`, { headers: h }),
    fetch(`${BASE}/search/issues?q=is:pr+is:open+author:${username}&per_page=8&sort=updated`, { headers: h }),
    fetch(`${BASE}/users/${username}/events?per_page=30`, { headers: h }),
  ]);

  const [reposData, prsData, eventsData] = await Promise.all([
    reposRes.json(),
    prsRes.json(),
    eventsRes.json(),
  ]);

  const repos = (Array.isArray(reposData) ? reposData : []).map((r: any) => ({
    name: r.name,
    fullName: r.full_name,
    url: r.html_url,
    language: r.language ?? null,
    stars: r.stargazers_count,
    openIssues: r.open_issues_count,
    pushedAt: r.pushed_at,
    private: r.private,
  }));

  const prs = (prsData.items ?? []).map((p: any) => ({
    number: p.number,
    title: p.title,
    repo: p.repository_url.replace(`${BASE}/repos/`, ""),
    url: p.html_url,
    createdAt: p.created_at,
    draft: p.draft ?? false,
  }));

  const pushes = (Array.isArray(eventsData) ? eventsData : [])
    .filter((e: any) => e.type === "PushEvent")
    .slice(0, 8)
    .map((e: any) => ({
      repo: e.repo.name,
      branch: (e.payload.ref ?? "").replace("refs/heads/", ""),
      commitCount: e.payload.commits?.length ?? 0,
      message: e.payload.commits?.[0]?.message?.split("\n")[0] ?? "",
      createdAt: e.created_at,
    }));

  return Response.json({ repos, prs, pushes });
}
