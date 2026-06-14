// ARIA agent tool argument types and discriminated union.
// Each member pairs a tool name with the exact args that tool expects,
// mirroring the JSON schemas declared in TOOLS in app/api/aria/route.ts.

export type ToolCall =
  | { name: "spotify_play";          args: { query: string } }
  | { name: "spotify_control";       args: { action: "pause" | "resume" | "next" | "previous" } }
  | { name: "spotify_play_playlist"; args: { playlist_name: string } }
  | { name: "habit_add";             args: { name: string } }
  | { name: "calendar_add_event";    args: { title: string; date: string; time?: string } }
  | { name: "github_summary";        args: { type: "prs" | "commits" | "all" } }
  | { name: "pomodoro_control";      args: { action: "start" | "stop"; minutes?: number } }
  | { name: "scratchpad_write";      args: { content: string; mode: "append" | "replace" } }
  | { name: "prayer_times";          args: Record<string, never> }
  | { name: "crypto_price";          args: { coin: string } }
  | { name: "morning_briefing";      args: Record<string, never> }
  | { name: "mood_log";              args: { mood: "great" | "good" | "okay" | "low" | "bad"; energy?: number; note?: string } }
  | { name: "news_headlines";        args: { topic: string; count?: number } };
