import { getSpotifyToken } from "../_token";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!q.trim()) return Response.json({ tracks: [] });

  const token = await getSpotifyToken();
  if (!token) return Response.json({ error: "Not authorized" }, { status: 401 });

  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=30`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return Response.json({ error: "Search failed" }, { status: res.status });
  const data = await res.json();

  return Response.json({
    tracks: data.tracks.items.map((t: any, idx: number) => ({
      idx: idx + 1,
      uri: t.uri,
      id: t.id,
      name: t.name,
      artist: t.artists.map((a: any) => a.name).join(", "),
      album: t.album.name,
      duration: t.duration_ms,
      image: t.album.images?.[2]?.url ?? t.album.images?.[0]?.url ?? null,
    })),
  });
}
