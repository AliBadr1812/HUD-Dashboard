import { getSpotifyToken } from "../_token";

function sf(url: string, token: string) {
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "playlists";
  const id = searchParams.get("id");

  const token = await getSpotifyToken();
  if (!token) return Response.json({ error: "Not authorized" }, { status: 401 });

  if (type === "playlists") {
    const res = await sf("https://api.spotify.com/v1/me/playlists?limit=50", token);
    if (!res.ok) return Response.json({ error: "Failed" }, { status: res.status });
    const data = await res.json();
    return Response.json({
      playlists: data.items
        .filter((p: any) => p?.tracks != null)
        .map((p: any) => ({
          id: p.id,
          uri: p.uri,
          name: p.name,
          total: p.tracks.total,
          image: p.images?.[0]?.url ?? null,
        })),
    });
  }

  if (type === "tracks" && id) {
    const res = await sf(`https://api.spotify.com/v1/playlists/${id}/tracks?limit=100&fields=items(track(uri,id,name,duration_ms,artists,album(name,images)))`, token);
    if (!res.ok) return Response.json({ error: "Failed" }, { status: res.status });
    const data = await res.json();
    return Response.json({
      tracks: data.items
        .filter((i: any) => i?.track?.uri)
        .map((i: any, idx: number) => ({
          idx: idx + 1,
          uri: i.track.uri,
          id: i.track.id,
          name: i.track.name,
          artist: i.track.artists.map((a: any) => a.name).join(", "),
          album: i.track.album.name,
          duration: i.track.duration_ms,
          image: i.track.album.images?.[2]?.url ?? i.track.album.images?.[0]?.url ?? null,
        })),
    });
  }

  if (type === "liked") {
    const res = await sf("https://api.spotify.com/v1/me/tracks?limit=50", token);
    if (!res.ok) return Response.json({ error: "Failed" }, { status: res.status });
    const data = await res.json();
    return Response.json({
      tracks: data.items.map((i: any, idx: number) => ({
        idx: idx + 1,
        uri: i.track.uri,
        id: i.track.id,
        name: i.track.name,
        artist: i.track.artists.map((a: any) => a.name).join(", "),
        album: i.track.album.name,
        duration: i.track.duration_ms,
        image: i.track.album.images?.[2]?.url ?? i.track.album.images?.[0]?.url ?? null,
      })),
    });
  }

  if (type === "state") {
    const res = await sf("https://api.spotify.com/v1/me/player", token);
    if (!res.ok || res.status === 204) return Response.json({ shuffle: false, repeat: "off", volume: 50 });
    const data = await res.json();
    return Response.json({
      shuffle: data.shuffle_state ?? false,
      repeat: data.repeat_state ?? "off",
      volume: data.device?.volume_percent ?? 50,
    });
  }

  if (type === "recent") {
    const res = await sf("https://api.spotify.com/v1/me/player/recently-played?limit=30", token);
    if (!res.ok) return Response.json({ error: "Failed" }, { status: res.status });
    const data = await res.json();
    const seen = new Set<string>();
    const tracks = (data.items ?? [])
      .filter((i: any) => {
        if (!i?.track?.uri || seen.has(i.track.uri)) return false;
        seen.add(i.track.uri);
        return true;
      })
      .map((i: any, idx: number) => ({
        idx: idx + 1,
        uri: i.track.uri,
        id: i.track.id,
        name: i.track.name,
        artist: i.track.artists.map((a: any) => a.name).join(", "),
        album: i.track.album.name,
        duration: i.track.duration_ms,
        image: i.track.album.images?.[2]?.url ?? i.track.album.images?.[0]?.url ?? null,
        playedAt: i.played_at,
      }));
    return Response.json({ tracks });
  }

  if (type === "devices") {
    const res = await sf("https://api.spotify.com/v1/me/player/devices", token);
    if (!res.ok) return Response.json({ devices: [] });
    const data = await res.json();
    return Response.json({
      devices: (data.devices ?? []).map((d: any) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        active: d.is_active,
        volume: d.volume_percent,
      })),
    });
  }

  return Response.json({ error: "Unknown type" }, { status: 400 });
}
