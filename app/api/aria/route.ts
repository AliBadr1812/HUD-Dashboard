import { getSpotifyToken } from "../spotify/_token";
import type { GitHubContributionDay, GitHubContributionsResponse, GitHubIssueSearchResponse } from "../../types/github";
import type { AladhanTimingsResponse } from "../../types/aladhan";
import type { OWMCurrentWeather } from "../../types/weather";
import type { CoinGeckoSimplePriceResponse } from "../../types/coingecko";
import type { NewsAPIResponse } from "../../types/newsapi";
import type { OllamaMessage, OllamaChatResponse } from "../../types/ollama";
import type { SearchResults, Paging, SimplifiedPlaylist } from "../../types/spotify";
import type { ToolCall } from "../../types/aria";

const OLLAMA_URL   = process.env.OLLAMA_URL   ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";

const SYSTEM_PROMPT = `You are ARIA (Adaptive Response Intelligence Agent), a personal AI assistant embedded in a sci-fi HUD dashboard. Your aesthetic is sleek, precise, and slightly futuristic — like Jarvis from Iron Man but warmer and more personal.

The user's name is Kirfa. He's based in Amsterdam. The dashboard shows: live clock, weather, Spotify, news, GitHub activity, prayer times, transport, calendar, finance, Pomodoro timer, system monitor, scratchpad, and mood log.

Guidelines:
- Be concise and direct. No fluff.
- Use a calm, confident tone — never sycophantic.
- For short factual answers, respond in 1-3 sentences.
- For complex topics, use brief bullet points.
- You can reference the widgets and data the user sees on the dashboard when relevant.
- Occasional dry wit is welcome.
- When the user asks you to play music, add habits, add calendar events, start a timer, write notes, check prices, or fetch data — USE THE TOOLS. Don't just describe what you'd do.
- For "good morning" or "morning briefing" — use the morning_briefing tool.
- For mood questions like "I'm feeling great" or "log my energy" — use mood_log.`;

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS = [
  {
    type: "function",
    function: {
      name: "spotify_play",
      description: "Search for a song, artist, or album on Spotify and immediately play it.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Search query" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "spotify_control",
      description: "Control Spotify playback: pause, resume, skip to next, or go to previous.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["pause", "resume", "next", "previous"] },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "spotify_play_playlist",
      description: "Play one of the user's Spotify playlists by name.",
      parameters: {
        type: "object",
        properties: {
          playlist_name: { type: "string", description: "Playlist name (partial match ok)" },
        },
        required: ["playlist_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "habit_add",
      description: "Add a new daily habit or mission to the habit tracker widget.",
      parameters: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calendar_add_event",
      description: "Add an event to the calendar widget.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          date:  { type: "string", description: "YYYY-MM-DD" },
          time:  { type: "string", description: "HH:MM 24h (optional)" },
        },
        required: ["title", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_summary",
      description: "Get GitHub activity for the user: open pull requests, today's commits, contribution streak.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["prs", "commits", "all"], description: "What to fetch" },
        },
        required: ["type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pomodoro_control",
      description: "Start or stop the Pomodoro focus timer on the dashboard.",
      parameters: {
        type: "object",
        properties: {
          action:  { type: "string", enum: ["start", "stop"] },
          minutes: { type: "number", description: "Session duration in minutes (default 25)" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scratchpad_write",
      description: "Write or append a note to the scratchpad widget on the dashboard.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string" },
          mode:    { type: "string", enum: ["append", "replace"], description: "append adds to existing, replace overwrites" },
        },
        required: ["content", "mode"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "prayer_times",
      description: "Get today's Islamic prayer times for Amsterdam from Aladhan.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "crypto_price",
      description: "Get the current price of a cryptocurrency (Bitcoin, Ethereum, Solana, etc.).",
      parameters: {
        type: "object",
        properties: {
          coin: { type: "string", description: "Coin ID: bitcoin, ethereum, solana, cardano, etc." },
        },
        required: ["coin"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "morning_briefing",
      description: "Deliver a complete morning briefing with weather, prayer times, GitHub stats, and today's schedule. Use this when the user says 'good morning' or asks for a briefing.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "mood_log",
      description: "Log the user's current mood or energy level to the mood widget on the dashboard.",
      parameters: {
        type: "object",
        properties: {
          mood:   { type: "string", enum: ["great", "good", "okay", "low", "bad"] },
          energy: { type: "number", description: "Energy level 1-5 (optional)" },
          note:   { type: "string", description: "Optional short note" },
        },
        required: ["mood"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "news_headlines",
      description: "Get top news headlines on a topic. Requires NEWS_API_KEY in .env.local.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Topic, keyword, or category" },
          count: { type: "number", description: "Number of articles (max 5, default 3)" },
        },
        required: ["topic"],
      },
    },
  },
];

// ── Tool labels ───────────────────────────────────────────────────────────────

function getToolLabel(call: ToolCall): string {
  switch (call.name) {
    case "spotify_play":          return `Searching Spotify for "${call.args.query}"`;
    case "spotify_control":       return `Spotify → ${call.args.action}`;
    case "spotify_play_playlist": return `Opening playlist "${call.args.playlist_name}"`;
    case "habit_add":             return `Adding habit: ${call.args.name}`;
    case "calendar_add_event":    return `Adding to calendar: ${call.args.title}`;
    case "github_summary":        return `Fetching GitHub ${call.args.type === "all" ? "activity" : call.args.type}`;
    case "pomodoro_control":      return `Pomodoro → ${call.args.action}${call.args.minutes ? ` (${call.args.minutes}min)` : ""}`;
    case "scratchpad_write":      return `Writing to scratchpad`;
    case "prayer_times":          return `Fetching prayer times`;
    case "crypto_price":          return `Getting ${call.args.coin} price`;
    case "morning_briefing":      return `Preparing morning briefing`;
    case "mood_log":              return `Logging mood: ${call.args.mood}`;
    case "news_headlines":        return `Fetching ${call.args.topic} headlines`;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchPrayerTimes(): Promise<Record<string, string> | null> {
  try {
    const res = await fetch(
      `https://api.aladhan.com/v1/timings/${Math.floor(Date.now() / 1000)}` +
      `?latitude=52.3676&longitude=4.9041&method=3&latitudeAdjustmentMethod=2`
    );
    if (!res.ok) return null;
    const json: AladhanTimingsResponse = await res.json();
    return json?.data?.timings ?? null;
  } catch { return null; }
}

function findNextPrayer(t: Record<string, string>): { name: string; time: string } | null {
  const prayers = [
    { name: "Fajr", time: t.Fajr },
    { name: "Dhuhr", time: t.Dhuhr },
    { name: "Asr", time: t.Asr },
    { name: "Maghrib", time: t.Maghrib },
    { name: "Isha", time: t.Isha },
  ];
  const now = new Date();
  return prayers.find(p => {
    const [h, m] = p.time.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d > now;
  }) ?? null;
}

async function fetchGitHubToday(): Promise<{ todayCount: number; streak: number; openPRs: number }> {
  const token    = process.env.GITHUB_TOKEN;
  const username = process.env.GITHUB_USERNAME;
  if (!token || !username) return { todayCount: 0, streak: 0, openPRs: 0 };

  const to   = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 7);

  try {
    const [gqlRes, prRes] = await Promise.all([
      fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "HUDDashboard/1.0" },
        body: JSON.stringify({
          query: `query($username:String!,$from:DateTime!,$to:DateTime!){user(login:$username){contributionsCollection(from:$from,to:$to){contributionCalendar{weeks{contributionDays{contributionCount date}}}}}}`,
          variables: { username, from: from.toISOString(), to: to.toISOString() },
        }),
      }),
      fetch(`https://api.github.com/search/issues?q=is:pr+is:open+author:${username}&per_page=1`, {
        headers: { Authorization: `Bearer ${token}`, "User-Agent": "HUDDashboard/1.0" },
      }),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    let allDays: GitHubContributionDay[] = [];
    if (gqlRes.ok) {
      const gqlData: GitHubContributionsResponse = await gqlRes.json();
      allDays = (gqlData?.data?.user?.contributionsCollection?.contributionCalendar?.weeks ?? [])
        .flatMap((w) => w.contributionDays);
    }
    const todayCount = allDays.find((d) => d.date === today)?.contributionCount ?? 0;

    // streak
    let streak = 0;
    for (const day of [...allDays].sort((a, b) => b.date.localeCompare(a.date))) {
      if (day.date > today) continue;
      if (day.contributionCount > 0) streak++;
      else if (day.date !== today) break;
    }

    const openPRs = prRes.ok ? ((await prRes.json()).total_count ?? 0) : 0;
    return { todayCount, streak, openPRs };
  } catch {
    return { todayCount: 0, streak: 0, openPRs: 0 };
  }
}

// ── Tool execution ────────────────────────────────────────────────────────────

type ToolResult = {
  result: string;
  action?: { name: string; data: Record<string, unknown> };
};

async function executeTool(call: ToolCall): Promise<ToolResult> {
  switch (call.name) {

    // ── Spotify ─────────────────────────────────────────────────────────────

    case "spotify_play": {
      const { query } = call.args;
      const token = await getSpotifyToken();
      if (!token) return { result: "Spotify not authorized" };
      const searchRes = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!searchRes.ok) return { result: "Spotify search failed" };
      const data: SearchResults = await searchRes.json();
      const track = data.tracks?.items?.[0];
      if (!track) return { result: `No tracks found for "${query}"` };
      await fetch("https://api.spotify.com/v1/me/player/play", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ uris: [track.uri] }),
      });
      return { result: `Now playing "${track.name}" by ${track.artists.map((a) => a.name).join(", ")}` };
    }

    case "spotify_control": {
      const { action } = call.args;
      const token = await getSpotifyToken();
      if (!token) return { result: "Spotify not authorized" };
      const map: Record<string, { url: string; method: string }> = {
        pause:    { url: "https://api.spotify.com/v1/me/player/pause",    method: "PUT"  },
        resume:   { url: "https://api.spotify.com/v1/me/player/play",     method: "PUT"  },
        next:     { url: "https://api.spotify.com/v1/me/player/next",     method: "POST" },
        previous: { url: "https://api.spotify.com/v1/me/player/previous", method: "POST" },
      };
      const { url, method } = map[action];
      await fetch(url, { method, headers: { Authorization: `Bearer ${token}` } });
      const labels: Record<string, string> = { pause: "Paused", resume: "Resumed", next: "Skipped to next", previous: "Went back" };
      return { result: labels[action] };
    }

    case "spotify_play_playlist": {
      const { playlist_name } = call.args;
      const token = await getSpotifyToken();
      if (!token) return { result: "Spotify not authorized" };
      const plRes = await fetch("https://api.spotify.com/v1/me/playlists?limit=20", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!plRes.ok) return { result: "Failed to fetch playlists" };
      const plData: Paging<SimplifiedPlaylist> = await plRes.json();
      const query    = playlist_name.toLowerCase();
      const playlist = (plData.items ?? []).find((p) => p?.name?.toLowerCase().includes(query));
      if (!playlist) return { result: `No playlist matching "${playlist_name}"` };
      await fetch("https://api.spotify.com/v1/me/player/play", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ context_uri: playlist.uri }),
      });
      return { result: `Playing "${playlist.name}"` };
    }

    // ── Dashboard widgets (client-side via actions) ───────────────────────────

    case "habit_add": {
      const { name } = call.args;
      return {
        result: `Added habit "${name}" to your tracker`,
        action: { name: "habit_add", data: { name } },
      };
    }

    case "calendar_add_event": {
      const { title, date, time } = call.args;
      const label = `${title} on ${date}${time ? ` at ${time}` : ""}`;
      return {
        result: `Added "${label}" to your calendar`,
        action: { name: "calendar_add_event", data: { title, date, time: time ?? "" } },
      };
    }

    case "pomodoro_control": {
      const { action, minutes: rawMinutes } = call.args;
      const minutes = Math.max(1, rawMinutes ?? 25);
      if (action === "start") {
        return {
          result: `Starting ${minutes}-minute focus session. Get to work.`,
          action: { name: "pomodoro_start", data: { minutes } },
        };
      }
      return {
        result: "Pomodoro stopped.",
        action: { name: "pomodoro_stop", data: {} },
      };
    }

    case "scratchpad_write": {
      const { content, mode } = call.args;
      const now     = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      const stamped = `[${now}] ${content}`;
      return {
        result: "Note saved to scratchpad.",
        action: { name: "scratchpad_write", data: { content: stamped, mode } },
      };
    }

    case "mood_log": {
      const { mood, energy, note } = call.args;
      return {
        result: `Mood logged: ${mood}${energy ? `, energy ${energy}/5` : ""}.`,
        action: {
          name: "mood_log",
          data: { mood, energy: energy ?? null, note: note ?? "", ts: Date.now() },
        },
      };
    }

    // ── External APIs ─────────────────────────────────────────────────────────

    case "github_summary": {
      const { type } = call.args;
      const token    = process.env.GITHUB_TOKEN;
      const username = process.env.GITHUB_USERNAME;
      if (!token || !username) return { result: "GitHub not configured (missing GITHUB_TOKEN / GITHUB_USERNAME)" };

      const lines: string[] = [];

      if (type === "prs" || type === "all") {
        try {
          const prRes = await fetch(
            `https://api.github.com/search/issues?q=is:pr+is:open+author:${username}&per_page=10&sort=updated`,
            { headers: { Authorization: `Bearer ${token}`, "User-Agent": "HUDDashboard/1.0" } }
          );
          if (prRes.ok) {
            const prData: GitHubIssueSearchResponse = await prRes.json();
            const prs = prData.items ?? [];
            if (prs.length === 0) {
              lines.push("No open pull requests.");
            } else {
              lines.push(`${prData.total_count} open PR(s):`);
              prs.slice(0, 5).forEach((pr) => {
                const repo = pr.repository_url?.split("/").slice(-1)[0] ?? "?";
                lines.push(`  • [${repo}] ${pr.title}`);
              });
            }
          }
        } catch {}
      }

      if (type === "commits" || type === "all") {
        try {
          const { todayCount, streak } = await fetchGitHubToday();
          lines.push(`Today: ${todayCount} commit${todayCount !== 1 ? "s" : ""} · Streak: ${streak} day${streak !== 1 ? "s" : ""}`);
        } catch {}
      }

      return { result: lines.join("\n") || "No GitHub data available." };
    }

    case "prayer_times": {
      const t = await fetchPrayerTimes();
      if (!t) return { result: "Could not fetch prayer times from Aladhan." };

      const prayers = [
        { name: "Fajr",    time: t.Fajr    },
        { name: "Sunrise", time: t.Sunrise  },
        { name: "Dhuhr",   time: t.Dhuhr   },
        { name: "Asr",     time: t.Asr     },
        { name: "Maghrib", time: t.Maghrib  },
        { name: "Isha",    time: t.Isha    },
      ];
      const next = findNextPrayer(t);
      const lines = prayers.map(p => `${p.name}: ${p.time}`);
      if (next) lines.push(`\nNext: ${next.name} at ${next.time}`);
      return { result: lines.join("\n") };
    }

    case "crypto_price": {
      const { coin } = call.args;
      const aliases: Record<string, string> = {
        btc: "bitcoin", eth: "ethereum", sol: "solana",
        bnb: "binancecoin", ada: "cardano", xrp: "ripple",
        doge: "dogecoin", dot: "polkadot", avax: "avalanche-2",
        link: "chainlink", matic: "matic-network",
      };
      const raw = coin.toLowerCase().trim().replace(/\s+/g, "-");
      const id  = aliases[raw] ?? raw;

      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd,eur&include_24hr_change=true`,
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) return { result: `CoinGecko request failed (${res.status})` };
        const data: CoinGeckoSimplePriceResponse = await res.json();
        const price = data[id];
        if (!price) return { result: `Unknown coin: "${coin}". Try bitcoin, ethereum, solana, etc.` };

        const usd    = price.usd != null
          ? `$${price.usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: price.usd < 1 ? 6 : 2 })}`
          : "N/A";
        const eur    = price.eur != null
          ? `€${price.eur.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: price.eur < 1 ? 6 : 2 })}`
          : "";
        const change = price.usd_24h_change;
        const dir    = change == null ? "" : change >= 0 ? `▲ +${change.toFixed(2)}%` : `▼ ${change.toFixed(2)}%`;

        const label = id.charAt(0).toUpperCase() + id.slice(1);
        return { result: `${label}: ${usd}${eur ? ` / ${eur}` : ""} ${dir}`.trim() };
      } catch {
        return { result: "CoinGecko request failed. Try again in a moment." };
      }
    }

    case "morning_briefing": {
      const lines: string[] = [];

      const now     = new Date();
      const dateStr = now.toLocaleString("en-GB", {
        timeZone: "Europe/Amsterdam",
        weekday: "long", day: "numeric", month: "long",
        hour: "2-digit", minute: "2-digit",
      });
      lines.push(`📅 ${dateStr} — Amsterdam`);

      try {
        const wKey = process.env.OPENWEATHER_API_KEY;
        if (wKey) {
          const wRes = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=Amsterdam&appid=${wKey}&units=metric`
          );
          if (wRes.ok) {
            const w: OWMCurrentWeather = await wRes.json();
            const temp      = Math.round(w.main?.temp ?? 0);
            const feelsLike = Math.round(w.main?.feels_like ?? 0);
            const desc      = w.weather?.[0]?.description ?? "—";
            const wind      = Math.round((w.wind?.speed ?? 0) * 3.6);
            lines.push(`🌤 Weather: ${temp}°C (feels ${feelsLike}°C), ${desc}, wind ${wind} km/h`);
          }
        }
      } catch {}

      try {
        const t    = await fetchPrayerTimes();
        const next = t ? findNextPrayer(t) : null;
        if (t && next) {
          lines.push(`🕌 Next prayer: ${next.name} at ${next.time}`);
          lines.push(`   Fajr ${t.Fajr} · Dhuhr ${t.Dhuhr} · Asr ${t.Asr} · Maghrib ${t.Maghrib} · Isha ${t.Isha}`);
        }
      } catch {}

      try {
        const { todayCount, streak, openPRs } = await fetchGitHubToday();
        const parts = [`${todayCount} commit${todayCount !== 1 ? "s" : ""} today`];
        if (streak > 0) parts.push(`${streak}-day streak`);
        if (openPRs > 0) parts.push(`${openPRs} open PR${openPRs !== 1 ? "s" : ""}`);
        lines.push(`💻 GitHub: ${parts.join(" · ")}`);
      } catch {}

      return { result: lines.join("\n") };
    }

    case "news_headlines": {
      const { topic, count: rawCount } = call.args;
      const key = process.env.NEWS_API_KEY;
      if (!key) {
        return { result: "NewsAPI not configured. Add NEWS_API_KEY=your_key to .env.local (free tier at newsapi.org)." };
      }
      const count = Math.min(rawCount ?? 3, 5);
      try {
        const res = await fetch(
          `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&sortBy=publishedAt&pageSize=${count}&apiKey=${key}`
        );
        if (!res.ok) return { result: "NewsAPI request failed." };
        const data: NewsAPIResponse = await res.json();
        const articles = data.articles ?? [];
        if (!articles.length) return { result: `No headlines found for "${topic}".` };
        const bullets = articles.map((a, i) =>
          `${i + 1}. ${a.title}${a.source?.name ? ` (${a.source.name})` : ""}`
        );
        return { result: `Top headlines — ${topic}:\n${bullets.join("\n")}` };
      } catch {
        return { result: "NewsAPI request failed." };
      }
    }
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let messages: { role: string; content: string }[];
  let context: string | undefined;
  try {
    const body = await req.json();
    messages   = body.messages;
    context    = body.context;
    if (!Array.isArray(messages) || messages.length === 0) throw new Error("bad");
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
  }

  const systemPrompt = context
    ? `${SYSTEM_PROMPT}\n\nCurrent dashboard state (live):\n${context}`
    : SYSTEM_PROMPT;

  const stream = new ReadableStream({
    async start(controller) {
      const enc  = new TextEncoder();
      const send = (data: object) => controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        let conversation: OllamaMessage[] = [
          { role: "system", content: systemPrompt },
          ...(messages as OllamaMessage[]),
        ];
        const pendingActions: { name: string; data: Record<string, unknown> }[] = [];

        // Tool loop — max 4 rounds (extra room for compound tools)
        for (let round = 0; round < 4; round++) {
          const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model:   OLLAMA_MODEL,
              messages: conversation,
              tools:   TOOLS,
              stream:  false,
            }),
          });

          if (!ollamaRes.ok) {
            const text = await ollamaRes.text();
            throw new Error(`Ollama ${ollamaRes.status}: ${text}`);
          }

          const ollamaData: OllamaChatResponse = await ollamaRes.json();
          const msg = ollamaData.message;

          // No tool calls → send final response
          if (!msg?.tool_calls?.length) {
            for (const action of pendingActions) {
              send({ type: "action", ...action });
            }
            const content: string = msg?.content ?? "";
            const words = content.split(/(\s+)/);
            for (const chunk of words) {
              if (chunk) send({ type: "text", text: chunk });
            }
            send({ type: "done" });
            return;
          }

          conversation.push({ role: "assistant", content: msg.content ?? "", tool_calls: msg.tool_calls });

          for (const toolCall of msg.tool_calls) {
            const rawArgs = toolCall.function?.arguments ?? {};
            const call = {
              name: toolCall.function?.name ?? "",
              args: typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs,
            } as ToolCall;

            send({ type: "tool_start", name: call.name, label: getToolLabel(call) });

            const { result: toolResult, action } = await executeTool(call);

            send({ type: "tool_done", name: call.name, result: toolResult });
            if (action) pendingActions.push(action);

            const toolMsg: OllamaMessage = { role: "tool", content: toolResult };
            if (toolCall.id) toolMsg.tool_call_id = toolCall.id;
            conversation.push(toolMsg);
          }
        }

        // Exhausted rounds
        for (const action of pendingActions) send({ type: "action", ...action });
        send({ type: "done" });

      } catch (err: unknown) {
        const raw = err instanceof Error ? err.message : "Unknown error";
        const msg = raw.includes("ECONNREFUSED") || raw.includes("fetch failed")
          ? "Ollama is not running. Start it with: ollama serve"
          : raw;
        send({ type: "error", message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
}
