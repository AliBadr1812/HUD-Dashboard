"use client";

import { useEffect, useRef, useState } from "react";
import { Music, SkipBack, SkipForward, Play, Pause, ArrowUpRight, Heart, Shuffle, Repeat, Repeat1, ChevronLeft, Search, Volume2, Monitor, Smartphone, Speaker, Tv } from "lucide-react";
import HudPanel from "./HudPanel";
import HudModal from "./HudModal";

type TrackData = {
  playing: boolean;
  trackName?: string;
  artist?: string;
  album?: string;
  albumArt?: string | null;
  progressMs?: number;
  durationMs?: number;
};

type Playlist = { id: string; uri: string; name: string; total: number; image: string | null };
type Track = { idx: number; uri: string; id: string; name: string; artist: string; album: string; duration: number; image: string | null };

function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

async function control(action: string, extra: Record<string, unknown> = {}) {
  await fetch("/api/spotify/control", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...extra }),
  });
}

// ── Library modal ─────────────────────────────────────────────────────────────

type LibView = "playlists" | "tracks" | "liked" | "search" | "recent";
type Device = { id: string; name: string; type: string; active: boolean; volume: number };

function TrackRow({
  track, playing, onPlay, onQueue, contextUri,
}: {
  track: Track;
  playing: boolean;
  onPlay: () => void;
  onQueue: () => void;
  contextUri?: string;
}) {
  return (
    <div
      onClick={onPlay}
      className={`flex items-center gap-2.5 px-2 py-1.5 cursor-pointer group transition-colors ${
        playing ? "bg-cyan-500/10" : "hover:bg-cyan-500/5"
      }`}
    >
      <span className={`text-[8px] w-5 text-right shrink-0 font-mono ${playing ? "text-cyan-400/70" : "text-cyan-400/20"}`}>
        {playing ? "▶" : track.idx}
      </span>
      {track.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={track.image} alt="" className="w-6 h-6 shrink-0 object-cover" />
      ) : (
        <div className="w-6 h-6 shrink-0 bg-cyan-500/10 flex items-center justify-center">
          <Music size={8} className="text-cyan-400/30" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className={`text-[10px] truncate ${playing ? "text-cyan-300" : "text-white/80"}`}>{track.name}</div>
        <div className="text-[8px] text-cyan-400/35 truncate">{track.artist}</div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onQueue(); }}
        className="text-cyan-400/0 group-hover:text-cyan-400/30 hover:!text-cyan-300 transition-colors text-[8px] tracking-widest shrink-0 px-1"
        title="Add to queue"
      >
        +Q
      </button>
      <span className="text-[8px] text-cyan-400/25 font-mono shrink-0">{fmtMs(track.duration)}</span>
    </div>
  );
}

function DeviceIcon({ type }: { type: string }) {
  const t = type.toLowerCase();
  if (t === "smartphone" || t === "phone") return <Smartphone size={10} />;
  if (t === "speaker") return <Speaker size={10} />;
  if (t === "tv" || t === "castdevice") return <Tv size={10} />;
  return <Monitor size={10} />;
}

function LibraryContent({ currentUri }: { currentUri: string | null }) {
  const [view, setView] = useState<LibView>("playlists");
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [volume, setVolume] = useState(50);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "context" | "track">("off");
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [showDevices, setShowDevices] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Load playlists + state + devices on mount
  useEffect(() => {
    fetch("/api/spotify/playlists?type=playlists")
      .then((r) => r.json())
      .then((d) => { if (d.playlists) setPlaylists(d.playlists); });

    fetch("/api/spotify/playlists?type=state")
      .then((r) => r.json())
      .then((d) => {
        setShuffle(d.shuffle ?? false);
        setRepeat(d.repeat ?? "off");
        setVolume(d.volume ?? 50);
      });

    fetch("/api/spotify/playlists?type=devices")
      .then((r) => r.json())
      .then((d) => { if (d.devices) setDevices(d.devices); });
  }, []);

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimer.current);

    if (!searchQuery.trim()) {
      searchTimer.current = setTimeout(() => {
        setSearchResults([]);
      }, 0);
      return () => clearTimeout(searchTimer.current);
    }

    searchTimer.current = setTimeout(() => {
      setLoading(true);
      fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}`)
        .then((r) => r.json())
        .then((d) => { if (d.tracks) setSearchResults(d.tracks); })
        .finally(() => setLoading(false));
    }, 400);

    return () => clearTimeout(searchTimer.current);
  }, [searchQuery]);

  const openPlaylist = (pl: Playlist) => {
    setSelectedPlaylist(pl);
    setView("tracks");
    setTracks([]);
    setLoading(true);
    fetch(`/api/spotify/playlists?type=tracks&id=${pl.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.tracks) setTracks(d.tracks); })
      .finally(() => setLoading(false));
  };

  const openLiked = () => {
    setSelectedPlaylist(null);
    setView("liked");
    setTracks([]);
    setLoading(true);
    fetch("/api/spotify/playlists?type=liked")
      .then((r) => r.json())
      .then((d) => { if (d.tracks) setTracks(d.tracks); })
      .finally(() => setLoading(false));
  };

  const openRecent = () => {
    setSelectedPlaylist(null);
    setView("recent");
    setTracks([]);
    setLoading(true);
    fetch("/api/spotify/playlists?type=recent")
      .then((r) => r.json())
      .then((d) => { if (d.tracks) setTracks(d.tracks); })
      .finally(() => setLoading(false));
  };

  const transferDevice = (deviceId: string) => {
    setShowDevices(false);
    control("transfer", { deviceId });
    setDevices((prev) => prev.map((d) => ({ ...d, active: d.id === deviceId })));
  };

  const playTrack = (track: Track, contextUri?: string) => {
    if (contextUri) {
      control("play_in_context", { contextUri, uri: track.uri });
    } else {
      control("play_uri", { uri: track.uri });
    }
  };

  const toggleShuffle = () => {
    const next = !shuffle;
    setShuffle(next);
    control("shuffle", { value: next });
  };

  const cycleRepeat = () => {
    const next = repeat === "off" ? "context" : repeat === "context" ? "track" : "off";
    setRepeat(next);
    control("repeat", { value: next });
  };

  const setVol = (v: number) => {
    setVolume(v);
    control("volume", { value: v });
  };

  const trackList = view === "search" ? searchResults : tracks;
  const trackContextUri = selectedPlaylist?.uri;

  return (
    <div className="-m-4">
      {/* Controls bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-cyan-500/10">
        <button
          onClick={toggleShuffle}
          className={`transition-colors shrink-0 ${shuffle ? "text-cyan-400" : "text-cyan-400/25 hover:text-cyan-400/50"}`}
          title="Shuffle"
        >
          <Shuffle size={12} />
        </button>

        <button
          onClick={cycleRepeat}
          className={`transition-colors shrink-0 ${repeat !== "off" ? "text-cyan-400" : "text-cyan-400/25 hover:text-cyan-400/50"}`}
          title={`Repeat: ${repeat}`}
        >
          {repeat === "track" ? <Repeat1 size={12} /> : <Repeat size={12} />}
        </button>

        <div className="flex items-center gap-1.5 flex-1">
          <Volume2 size={11} className="text-cyan-400/30 shrink-0" />
          <input
            type="range" min={0} max={100} step={1}
            value={volume}
            onChange={(e) => setVol(Number(e.target.value))}
            className="flex-1 h-0.5 accent-cyan-400"
            style={{ accentColor: "rgba(0,229,255,0.7)" }}
          />
          <span className="text-[8px] font-mono text-cyan-400/30 w-6 text-right">{volume}</span>
        </div>

        {/* Device switcher */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowDevices((v) => !v)}
            title="Switch device"
            className={`transition-colors ${showDevices ? "text-cyan-300" : "text-cyan-400/25 hover:text-cyan-400/60"}`}
          >
            <Monitor size={12} />
          </button>
          {showDevices && devices.length > 0 && (
            <div className="absolute right-0 bottom-full mb-1 w-52 bg-[#0a1620] border border-cyan-500/20 shadow-xl z-10">
              <div className="px-3 py-1.5 border-b border-cyan-500/10">
                <span className="text-[7px] text-cyan-400/30 tracking-[0.25em] uppercase">Devices</span>
              </div>
              {devices.map((d) => (
                <button
                  key={d.id}
                  onClick={() => transferDevice(d.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-cyan-500/5 transition-colors ${d.active ? "text-cyan-300" : "text-white/50"}`}
                >
                  <DeviceIcon type={d.type} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] truncate">{d.name}</div>
                    {d.active && <div className="text-[7px] text-cyan-400/40 tracking-widest">ACTIVE</div>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center gap-0 border-b border-cyan-500/10">
        {view === "tracks" ? (
          <button
            onClick={() => { setView("playlists"); setSelectedPlaylist(null); }}
            className="flex items-center gap-1 px-3 py-2 text-cyan-400/50 hover:text-cyan-300 transition-colors"
          >
            <ChevronLeft size={11} />
            <span className="text-[8px] tracking-widest uppercase">Back</span>
          </button>
        ) : (
          <>
            <button
              onClick={() => { setView("playlists"); setSearchQuery(""); }}
              className={`px-3 py-2 text-[8px] tracking-widest uppercase transition-colors border-b-2 ${view === "playlists" ? "text-cyan-400/80 border-cyan-400/50" : "text-cyan-400/25 border-transparent hover:text-cyan-400/50"}`}
            >
              Library
            </button>
            <button
              onClick={openLiked}
              className={`flex items-center gap-1 px-3 py-2 text-[8px] tracking-widest uppercase transition-colors border-b-2 ${view === "liked" ? "text-cyan-400/80 border-cyan-400/50" : "text-cyan-400/25 border-transparent hover:text-cyan-400/50"}`}
            >
              <Heart size={9} />
              Liked
            </button>
            <button
              onClick={openRecent}
              className={`px-3 py-2 text-[8px] tracking-widest uppercase transition-colors border-b-2 ${view === "recent" ? "text-cyan-400/80 border-cyan-400/50" : "text-cyan-400/25 border-transparent hover:text-cyan-400/50"}`}
            >
              Recent
            </button>
          </>
        )}

        {/* Search input */}
        <div className="flex-1 flex items-center gap-1.5 px-3 py-1.5">
          <Search size={10} className="text-cyan-400/25 shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value) setView("search"); }}
            placeholder="Search tracks..."
            className="flex-1 bg-transparent text-[9px] text-cyan-400/70 placeholder:text-cyan-400/20 tracking-wider focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(""); setView("playlists"); }} className="text-cyan-400/25 hover:text-cyan-300 transition-colors text-[9px]">✕</button>
          )}
        </div>
      </div>

      {/* Section title */}
      {(view === "tracks" || view === "liked" || view === "recent") && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-cyan-500/10">
          {selectedPlaylist?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selectedPlaylist.image} alt="" className="w-8 h-8 object-cover border border-cyan-500/20 shrink-0" />
          )}
          {!selectedPlaylist && view === "liked" && <Heart size={14} className="text-cyan-400/40" />}
          {view === "recent" && <Monitor size={14} className="text-cyan-400/40" />}
          <div>
            <div className="text-[9px] text-cyan-400/70 tracking-widest uppercase truncate">
              {view === "liked" ? "Liked Songs" : view === "recent" ? "Recently Played" : selectedPlaylist?.name}
            </div>
            <div className="text-[7px] text-cyan-400/25 tracking-widest">
              {tracks.length} tracks
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="overflow-y-auto" style={{ maxHeight: "52vh" }}>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <span className="text-[8px] tracking-[0.3em] uppercase text-cyan-400/20 animate-pulse">Loading...</span>
          </div>
        )}

        {/* Playlists grid */}
        {view === "playlists" && !loading && (
          <div className="p-3 grid grid-cols-2 gap-2">
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => openPlaylist(pl)}
                className="flex items-center gap-2.5 p-2 border border-cyan-500/10 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-colors text-left"
              >
                {pl.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pl.image} alt="" className="w-10 h-10 object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <Music size={14} className="text-cyan-400/30" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-[9px] text-white/70 truncate leading-tight">{pl.name}</div>
                  <div className="text-[7px] text-cyan-400/25 tracking-widest mt-0.5">{pl.total} tracks</div>
                </div>
              </button>
            ))}
            {!loading && playlists.length === 0 && (
              <div className="col-span-2 text-center py-6 text-[8px] text-cyan-400/20 tracking-widest">
                No playlists found — re-authorize at /api/spotify/login
              </div>
            )}
          </div>
        )}

        {/* Track list (playlist, liked, recent, search) */}
        {(view === "tracks" || view === "liked" || view === "recent" || view === "search") && !loading && (
          <div className="py-1">
            {view === "search" && searchQuery && searchResults.length === 0 && (
              <div className="text-center py-6 text-[8px] text-cyan-400/20 tracking-widest">No results</div>
            )}
            {trackList.map((t) => (
              <TrackRow
                key={t.uri}
                track={t}
                playing={t.uri === currentUri}
                onPlay={() => playTrack(t, trackContextUri)}
                onQueue={() => control("queue", { uri: t.uri })}
                contextUri={trackContextUri}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

export default function SpotifyNowPlaying() {
  const [track, setTrack] = useState<TrackData | null>(null);
  const [liveProgress, setLiveProgress] = useState(0);
  const [error, setError] = useState(false);
  const [notAuthed, setNotAuthed] = useState(false);
  const [expandOpen, setExpandOpen] = useState(false);

  useEffect(() => {
    const load = () =>
      fetch("/api/spotify")
        .then((r) => {
          if (r.status === 401) { setNotAuthed(true); return null; }
          if (r.status === 500) { setError(true); return null; }
          return r.json();
        })
        .then((d) => {
          if (d) {
            setTrack(d);
            setLiveProgress(d.progressMs ?? 0);
            setError(false);
            setNotAuthed(false);
          }
        })
        .catch(() => setError(true));

    load();
    const pollId = setInterval(load, 1_000);
    return () => clearInterval(pollId);
  }, []);

  useEffect(() => {
    if (!track?.playing) return;
    const tickId = setInterval(() => {
      setLiveProgress((p) => Math.min(p + 1000, track.durationMs ?? p));
    }, 1000);
    return () => clearInterval(tickId);
  }, [track?.playing, track?.durationMs]);

  const pct = track?.durationMs && liveProgress
    ? Math.round((liveProgress / track.durationMs) * 100)
    : 0;

  // Current track URI — constructed from the track name for highlighting
  // The Spotify API returns URIs in the playlists endpoint but not in /me/player/currently-playing by default
  // We derive it from the track state if available (we'll add uri to the now-playing response)
  const currentUri = (track as any)?.uri ?? null;

  const actions = (
    <button onClick={() => setExpandOpen(true)} className="text-cyan-400/30 hover:text-cyan-300 transition-colors p-0.5">
      <ArrowUpRight size={11} />
    </button>
  );

  return (
    <>
      <HudModal isOpen={expandOpen} onClose={() => setExpandOpen(false)} title="SPOTIFY — LIBRARY" width="520px">
        <LibraryContent currentUri={currentUri} />
      </HudModal>

      <HudPanel title="SPOTIFY" icon={<Music size={10} />} actions={actions}>
        {error && (
          <div className="text-[9px] text-amber-400/50 tracking-wider">
            Add SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET to .env.local
          </div>
        )}

        {notAuthed && !error && (
          <div className="text-[9px] text-amber-400/50 tracking-wider">
            Visit{" "}
            <a href="/api/spotify/login" target="_blank" className="text-cyan-400 underline">
              /api/spotify/login
            </a>{" "}
            to connect
          </div>
        )}

        {!error && !notAuthed && !track?.playing && (
          <div className="flex items-center gap-2 text-[10px] text-cyan-400/30">
            <Music size={14} className="opacity-40" />
            <span className="tracking-widest">NOTHING PLAYING</span>
          </div>
        )}

        {track?.playing && track.trackName && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {track.albumArt ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={track.albumArt} alt={track.album} className="w-10 h-10 shrink-0 border border-cyan-500/20" />
              ) : (
                <div className="w-10 h-10 shrink-0 bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <Music size={14} className="text-cyan-400/40" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs text-white font-medium truncate leading-tight">{track.trackName}</div>
                <div className="text-[10px] text-cyan-400/60 truncate mt-0.5">{track.artist}</div>
                <div className="text-[9px] text-cyan-400/30 truncate">{track.album}</div>
              </div>
            </div>

            {track.durationMs ? (
              <div className="space-y-1">
                <div
                  className="h-1 bg-cyan-500/10 rounded-full overflow-hidden cursor-pointer group"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    const posMs = Math.round(fraction * (track.durationMs ?? 0));
                    setLiveProgress(posMs);
                    control("seek", { value: posMs });
                  }}
                >
                  <div className="h-full bg-cyan-400/60 group-hover:bg-cyan-400/80 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-[8px] text-cyan-400/25">
                  <span>{fmtMs(liveProgress)}</span>
                  <span>{fmtMs(track.durationMs)}</span>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-center gap-5 pt-1">
              <button onClick={() => control("previous")} className="text-cyan-400/40 hover:text-cyan-300 transition-colors">
                <SkipBack size={14} />
              </button>
              <button
                onClick={() => control(track.playing ? "pause" : "play")}
                className="text-cyan-400/70 hover:text-cyan-300 transition-colors border border-cyan-500/30 hover:border-cyan-400/60 rounded-sm p-1"
              >
                {track.playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button onClick={() => control("next")} className="text-cyan-400/40 hover:text-cyan-300 transition-colors">
                <SkipForward size={14} />
              </button>
            </div>
          </div>
        )}
      </HudPanel>
    </>
  );
}
