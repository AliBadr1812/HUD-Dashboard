import { readFile } from "fs/promises";
import { join } from "path";
import type { PlaybackState, DashNowPlaying } from "../../types/spotify";

async function getRefreshToken(): Promise<string | null> {
  // Prefer env var (survives reinstalls)
  if (process.env.SPOTIFY_REFRESH_TOKEN) return process.env.SPOTIFY_REFRESH_TOKEN;

  try {
    const raw = await readFile(join(process.cwd(), "data", "spotify-token.json"), "utf-8");
    const parsed = JSON.parse(raw);
    return parsed.refreshToken ?? null;
  } catch {
    return null;
  }
}

async function getAccessToken(refreshToken: string): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return Response.json({ error: "SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not set" }, { status: 500 });
  }

  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return Response.json({ error: "Not authorized — visit /api/spotify/login" }, { status: 401 });
  }

  const accessToken = await getAccessToken(refreshToken);
  if (!accessToken) {
    return Response.json({ error: "Failed to get access token" }, { status: 502 });
  }

  const npRes = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (npRes.status === 204 || !npRes.ok) {
    return Response.json({ playing: false });
  }

  const np: PlaybackState = await npRes.json();
  if (!np?.item) return Response.json({ playing: false } satisfies DashNowPlaying);

  const result: DashNowPlaying = {
    playing: np.is_playing,
    uri: np.item.uri,
    trackName: np.item.name,
    artist: np.item.artists.map(a => a.name).join(", "),
    album: np.item.album.name,
    albumArt: np.item.album.images?.[0]?.url ?? null,
    progressMs: np.progress_ms ?? undefined,
    durationMs: np.item.duration_ms,
  };
  return Response.json(result);
}
