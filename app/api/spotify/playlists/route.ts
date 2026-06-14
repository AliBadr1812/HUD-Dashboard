import { getSpotifyToken } from "../_token";
import type {
  Paging,
  SimplifiedPlaylist,
  PlaylistTrackObject,
  SavedTrack,
  PlayHistory,
  PlaybackState,
  Device,
  PlayerQueue,
  DashPlaylist,
  DashTrack,
  DashDevice,
  DashPlaybackState,
  DashQueue,
} from "../../../types/spotify";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "playlists";
  const id = searchParams.get("id");

  const token = await getSpotifyToken();
  if (!token) {
    console.error("[spotify] No token available");
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  if (type === "playlists") {
    const res = await fetch("https://api.spotify.com/v1/me/playlists?limit=20",
      { headers: { Authorization: `Bearer ${token}` } });
    console.log(`[spotify/playlists] Spotify status: ${res.status}`);
    if (!res.ok) {
      const body = await res.text();
      console.error(`[spotify/playlists] Error body: ${body}`);
      return Response.json({ error: "Failed" }, { status: res.status });
    }
    const data: Paging<SimplifiedPlaylist> = await res.json();
    const raw = data.items ?? [];
    console.log(`[spotify/playlists] raw=${raw.length}; first items field: ${JSON.stringify(raw[0]?.items)}`);
    const filtered = raw.filter(p => p?.id && p?.name);
    console.log(`[spotify/playlists] after id+name filter=${filtered.length}`);
    filtered.forEach(p => {
      console.log(`  • "${p.name}" — ${p.items?.total ?? "?"} tracks (id=${p.id})`);
    });
    return Response.json({
      playlists: filtered.map((p): DashPlaylist => ({
        id: p.id,
        uri: p.uri,
        name: p.name,
        total: p.items?.total ?? 0,
        image: p.images?.[0]?.url ?? null,
      })),
    });
  }

  if (type === "tracks" && id) {
    const res = await fetch(`https://api.spotify.com/v1/playlists/${id}/items?limit=20`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`[spotify/tracks] playlist=${id} status=${res.status}`);
    if (!res.ok) return Response.json({ error: "Failed" }, { status: res.status });
    const data: Paging<PlaylistTrackObject> = await res.json();
    const tracks: DashTrack[] = data.items
      .filter(i => i?.item?.uri)
      .map((i, idx) => {
        const t = i.item!;
        return {
          idx: idx + 1,
          uri: t.uri,
          id: t.id,
          name: t.name,
          artist: t.artists.map(a => a.name).join(", "),
          album: t.album.name,
          duration: t.duration_ms,
          image: t.album.images?.[2]?.url ?? t.album.images?.[0]?.url ?? null,
        };
      });
    console.log(`[spotify/tracks] returned ${tracks.length} tracks`);
    return Response.json({ tracks });
  }

  if (type === "liked") {
    const res = await fetch("https://api.spotify.com/v1/me/tracks?limit=20", {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`[spotify/liked] status=${res.status}`);
    if (!res.ok) return Response.json({ error: "Failed" }, { status: res.status });
    const data: Paging<SavedTrack> = await res.json();
    const tracks: DashTrack[] = data.items.map((i, idx) => ({
      idx: idx + 1,
      uri: i.track.uri,
      id: i.track.id,
      name: i.track.name,
      artist: i.track.artists.map(a => a.name).join(", "),
      album: i.track.album.name,
      duration: i.track.duration_ms,
      image: i.track.album.images?.[2]?.url ?? i.track.album.images?.[0]?.url ?? null,
    }));
    console.log(`[spotify/liked] returned ${tracks.length} tracks`);
    return Response.json({ tracks });
  }

  if (type === "state") {
    const res = await fetch("https://api.spotify.com/v1/me/player", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok || res.status === 204) {
      return Response.json({ shuffle: false, repeat: "off", volume: 50 } satisfies DashPlaybackState);
    }
    const data: PlaybackState = await res.json();
    const result: DashPlaybackState = {
      shuffle: data.shuffle_state ?? false,
      repeat: data.repeat_state ?? "off",
      volume: data.device?.volume_percent ?? 50,
    };
    return Response.json(result);
  }

  if (type === "recent") {
    const res = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=20", {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`[spotify/recent] status=${res.status}`);
    if (!res.ok) {
      const body = await res.text();
      console.error(`[spotify/recent] Error body: ${body}`);
      return Response.json({ error: "Failed" }, { status: res.status });
    }
    const data: { items: PlayHistory[] } = await res.json();
    const seen = new Set<string>();
    const tracks: DashTrack[] = (data.items ?? [])
      .filter(i => {
        if (!i?.track?.uri || seen.has(i.track.uri)) return false;
        seen.add(i.track.uri);
        return true;
      })
      .map((i, idx) => ({
        idx: idx + 1,
        uri: i.track.uri,
        id: i.track.id,
        name: i.track.name,
        artist: i.track.artists.map(a => a.name).join(", "),
        album: i.track.album.name,
        duration: i.track.duration_ms,
        image: i.track.album.images?.[2]?.url ?? i.track.album.images?.[0]?.url ?? null,
        playedAt: i.played_at,
      }));
    console.log(`[spotify/recent] raw=${data.items?.length ?? 0}, after dedup=${tracks.length}`);
    return Response.json({ tracks });
  }

  if (type === "queue") {
    const res = await fetch("https://api.spotify.com/v1/me/player/queue", {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`[spotify/queue] status=${res.status}`);
    if (!res.ok || res.status === 204) {
      return Response.json({ currentlyPlaying: null, queue: [] } satisfies DashQueue);
    }
    const data: PlayerQueue = await res.json();
    const mapTrack = (t: PlayerQueue["queue"][number], idx: number): DashTrack => ({
      idx,
      uri: t.uri,
      id: t.id,
      name: t.name,
      artist: t.artists.map(a => a.name).join(", "),
      album: t.album.name,
      duration: t.duration_ms,
      image: t.album.images?.[2]?.url ?? t.album.images?.[0]?.url ?? null,
    });
    const result: DashQueue = {
      currentlyPlaying: data.currently_playing ? mapTrack(data.currently_playing, 0) : null,
      queue: data.queue.map((t, idx) => mapTrack(t, idx + 1)),
    };
    console.log(`[spotify/queue] queue length=${result.queue.length}`);
    return Response.json(result);
  }

  if (type === "devices") {
    const res = await fetch("https://api.spotify.com/v1/me/player/devices",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`[spotify/devices] status=${res.status}`);
    if (!res.ok) return Response.json({ devices: [] });
    const data: { devices: Device[] } = await res.json();
    const devices: DashDevice[] = (data.devices ?? []).map(d => ({
      id: d.id ?? "",
      name: d.name,
      type: d.type,
      active: d.is_active,
      volume: d.volume_percent ?? 0,
    }));
    console.log(`[spotify/devices] ${devices.length} device(s): ${devices.map(d => d.name).join(", ")}`);
    return Response.json({ devices });
  }

  return Response.json({ error: "Unknown type" }, { status: 400 });
}
