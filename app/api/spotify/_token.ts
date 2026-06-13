import { readFile } from "fs/promises";
import { join } from "path";

export async function getSpotifyToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  let refreshToken = process.env.SPOTIFY_REFRESH_TOKEN ?? null;
  if (!refreshToken) {
    try {
      const raw = await readFile(join(process.cwd(), "data", "spotify-token.json"), "utf-8");
      refreshToken = JSON.parse(raw).refreshToken ?? null;
    } catch { return null; }
  }
  if (!refreshToken) return null;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });

  if (!res.ok) return null;
  return (await res.json()).access_token ?? null;
}
