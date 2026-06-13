import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return new Response(`Spotify auth error: ${error ?? "no code"}`, { status: 400 });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI ?? "http://127.0.0.1:3000/api/spotify/callback";

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    return new Response(`Failed to exchange code: ${body}`, { status: 502 });
  }

  const tokens = await tokenRes.json();
  const refreshToken: string = tokens.refresh_token;

  // Persist refresh token
  const dataDir = join(process.cwd(), "data");
  await mkdir(dataDir, { recursive: true });
  await writeFile(
    join(dataDir, "spotify-token.json"),
    JSON.stringify({ refreshToken }, null, 2)
  );

  return new Response(
    `<html><body style="font-family:monospace;background:#080e14;color:#00e5ff;padding:2rem">
      <h2>✓ Spotify connected!</h2>
      <p>Refresh token saved. You can close this tab.</p>
      <p style="font-size:0.8rem;color:#555">
        Optionally add to .env.local for persistence across reinstalls:<br/>
        <code>SPOTIFY_REFRESH_TOKEN=${refreshToken}</code>
      </p>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
