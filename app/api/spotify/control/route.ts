import { getSpotifyToken } from "../_token";

export async function POST(request: Request) {
  const body = await request.json() as Record<string, any>;
  const { action } = body;

  const token = await getSpotifyToken();
  if (!token) return Response.json({ error: "Not authorized" }, { status: 401 });

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  let url: string;
  let method: string;
  let bodyStr: string | undefined;

  switch (action) {
    case "play":
      url = "https://api.spotify.com/v1/me/player/play";
      method = "PUT";
      break;
    case "pause":
      url = "https://api.spotify.com/v1/me/player/pause";
      method = "PUT";
      break;
    case "next":
      url = "https://api.spotify.com/v1/me/player/next";
      method = "POST";
      break;
    case "previous":
      url = "https://api.spotify.com/v1/me/player/previous";
      method = "POST";
      break;

    // Play a single track (or array of tracks)
    case "play_uri":
      url = "https://api.spotify.com/v1/me/player/play";
      method = "PUT";
      bodyStr = JSON.stringify({ uris: [body.uri] });
      break;

    // Play a track within a playlist/album context
    case "play_in_context":
      url = "https://api.spotify.com/v1/me/player/play";
      method = "PUT";
      bodyStr = JSON.stringify({
        context_uri: body.contextUri,
        offset: { uri: body.uri },
        position_ms: 0,
      });
      break;

    // Add to queue
    case "queue":
      url = `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(body.uri)}`;
      method = "POST";
      break;

    // Volume (0–100)
    case "volume":
      url = `https://api.spotify.com/v1/me/player/volume?volume_percent=${Math.round(body.value)}`;
      method = "PUT";
      break;

    // Shuffle
    case "shuffle":
      url = `https://api.spotify.com/v1/me/player/shuffle?state=${body.value ? "true" : "false"}`;
      method = "PUT";
      break;

    // Repeat: "off" | "context" | "track"
    case "repeat":
      url = `https://api.spotify.com/v1/me/player/repeat?state=${body.value}`;
      method = "PUT";
      break;

    // Seek to position (ms)
    case "seek":
      url = `https://api.spotify.com/v1/me/player/seek?position_ms=${Math.round(body.value)}`;
      method = "PUT";
      break;

    // Transfer playback to device
    case "transfer":
      url = "https://api.spotify.com/v1/me/player";
      method = "PUT";
      bodyStr = JSON.stringify({ device_ids: [body.deviceId], play: true });
      break;

    default:
      return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  const res = await fetch(url, { method, headers, body: bodyStr });

  if (res.status === 204 || res.status === 202 || res.ok) {
    return Response.json({ ok: true });
  }

  const text = await res.text();
  return Response.json({ error: text }, { status: res.status });
}
