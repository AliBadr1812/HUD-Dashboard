const GRAPHQL_QUERY = `
query($username: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $username) {
    name
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            contributionCount
            date
          }
        }
      }
    }
  }
}`;

function calcStreak(days: { date: string; contributionCount: number }[]): number {
  const sorted = [...days].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (const day of sorted) {
    if (day.date > today) continue;
    if (day.contributionCount > 0) streak++;
    else if (day.date !== today) break;
  }
  return streak;
}

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  const username = process.env.GITHUB_USERNAME;

  if (!token || !username) {
    return Response.json({ error: "GITHUB_TOKEN and GITHUB_USERNAME not set" }, { status: 500 });
  }

  const to = new Date();
  const from = new Date(to);
  from.setFullYear(to.getFullYear() - 1);

  const gqlRes = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "HUDDashboard/1.0",
    },
    body: JSON.stringify({
      query: GRAPHQL_QUERY,
      variables: { username, from: from.toISOString(), to: to.toISOString() },
    }),
    next: { revalidate: 300 },
  });

  if (!gqlRes.ok) {
    return Response.json({ error: "GitHub API request failed" }, { status: 502 });
  }

  const gqlData = await gqlRes.json();
  const cal = gqlData?.data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal) {
    return Response.json({ error: gqlData?.errors?.[0]?.message ?? "No data" }, { status: 502 });
  }

  const allDays = cal.weeks.flatMap((w: { contributionDays: { date: string; contributionCount: number }[] }) => w.contributionDays);
  const streak = calcStreak(allDays);

  // Last 16 weeks for heatmap
  const recentWeeks = cal.weeks.slice(-16) as {
    contributionDays: { date: string; contributionCount: number }[];
  }[];

  // Today's contributions
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = allDays.find((d: { date: string; contributionCount: number }) => d.date === today)?.contributionCount ?? 0;

  return Response.json({
    username,
    total: cal.totalContributions,
    streak,
    todayCount,
    weeks: recentWeeks,
  });
}
