"use client";

import { useEffect, useRef, useState } from "react";
import { Music, SkipBack, SkipForward, Play, Pause, ArrowUpRight, Heart, Shuffle, Repeat, Repeat1, ChevronLeft, Search, Volume2, Monitor, Smartphone, Speaker, Tv, PictureInPicture2, X, Maximize2 } from "lucide-react";
import HudPanel from "./HudPanel";
import HudModal from "./HudModal";
import { useHudShortcut } from "../hooks/useHudShortcut";
import type { DashNowPlaying, DashPlaylist, DashTrack, DashDevice, DashPlaybackState, DashQueue } from "../types/spotify";

type TrackData = DashNowPlaying;
type Playlist = DashPlaylist;
type Track = DashTrack;

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

type LibView = "playlists" | "tracks" | "liked" | "search" | "recent" | "queue";
type Device = DashDevice;
type RepeatState = DashPlaybackState["repeat"];

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
        playing ? "bg-accent-500/10" : "hover:bg-accent-500/5"
      }`}
    >
      <span className={`text-[8px] w-5 text-right shrink-0 font-mono ${playing ? "text-accent-400/70" : "text-accent-400/20"}`}>
        {playing ? "▶" : track.idx}
      </span>
      {track.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={track.image} alt="" className="w-6 h-6 shrink-0 object-cover" />
      ) : (
        <div className="w-6 h-6 shrink-0 bg-accent-500/10 flex items-center justify-center">
          <Music size={8} className="text-accent-400/30" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className={`text-[10px] truncate ${playing ? "text-accent-300" : "text-white/80"}`}>{track.name}</div>
        <div className="text-[8px] text-accent-400/35 truncate">{track.artist}</div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onQueue(); }}
        className="text-accent-400/0 group-hover:text-accent-400/30 hover:!text-accent-300 transition-colors text-[8px] tracking-widest shrink-0 px-1"
        title="Add to queue"
      >
        +Q
      </button>
      <span className="text-[8px] text-accent-400/25 font-mono shrink-0">{fmtMs(track.duration)}</span>
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
  const [repeat, setRepeat] = useState<RepeatState>("off");
  const [loading, setLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [queue, setQueue] = useState<DashQueue>({ currentlyPlaying: null, queue: [] });
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
    setTrackError(null);
    setLoading(true);
    fetch(`/api/spotify/playlists?type=tracks&id=${pl.id}`)
      .then((r) => {
        if (r.status === 403) throw new Error("Access denied — this playlist may be private or restricted");
        if (!r.ok) throw new Error(`Failed to load tracks (${r.status})`);
        return r.json();
      })
      .then((d) => { if (d.tracks) setTracks(d.tracks); })
      .catch((err) => setTrackError(err.message))
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

  const openQueue = () => {
    setSelectedPlaylist(null);
    setView("queue");
    setQueue({ currentlyPlaying: null, queue: [] });
    setLoading(true);
    fetch("/api/spotify/playlists?type=queue")
      .then((r) => r.json())
      .then((d) => setQueue(d))
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
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-accent-500/10">
        <button
          onClick={toggleShuffle}
          className={`transition-colors shrink-0 ${shuffle ? "text-accent-400" : "text-accent-400/25 hover:text-accent-400/50"}`}
          title="Shuffle"
        >
          <Shuffle size={12} />
        </button>

        <button
          onClick={cycleRepeat}
          className={`transition-colors shrink-0 ${repeat !== "off" ? "text-accent-400" : "text-accent-400/25 hover:text-accent-400/50"}`}
          title={`Repeat: ${repeat}`}
        >
          {repeat === "track" ? <Repeat1 size={12} /> : <Repeat size={12} />}
        </button>

        <div className="flex items-center gap-1.5 flex-1">
          <Volume2 size={11} className="text-accent-400/30 shrink-0" />
          <input
            type="range" min={0} max={100} step={1}
            value={volume}
            onChange={(e) => setVol(Number(e.target.value))}
            className="flex-1 h-0.5 accent-accent-400"
            style={{ accentColor: "var(--ac-solid)" }}
          />
          <span className="text-[8px] font-mono text-accent-400/30 w-6 text-right">{volume}</span>
        </div>

        {/* Device switcher */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowDevices((v) => !v)}
            title="Switch device"
            className={`transition-colors ${showDevices ? "text-accent-300" : "text-accent-400/25 hover:text-accent-400/60"}`}
          >
            <Monitor size={12} />
          </button>
          {showDevices && devices.length > 0 && (
            <div className="absolute right-0 bottom-full mb-1 w-52 bg-[#0a1620] border border-accent-500/20 shadow-xl z-10">
              <div className="px-3 py-1.5 border-b border-accent-500/10">
                <span className="text-[7px] text-accent-400/30 tracking-[0.25em] uppercase">Devices</span>
              </div>
              {devices.map((d) => (
                <button
                  key={d.id}
                  onClick={() => transferDevice(d.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-accent-500/5 transition-colors ${d.active ? "text-accent-300" : "text-white/50"}`}
                >
                  <DeviceIcon type={d.type} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] truncate">{d.name}</div>
                    {d.active && <div className="text-[7px] text-accent-400/40 tracking-widest">ACTIVE</div>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center gap-0 border-b border-accent-500/10">
        {view === "tracks" ? (
          <button
            onClick={() => { setView("playlists"); setSelectedPlaylist(null); }}
            className="flex items-center gap-1 px-3 py-2 text-accent-400/50 hover:text-accent-300 transition-colors"
          >
            <ChevronLeft size={11} />
            <span className="text-[8px] tracking-widest uppercase">Back</span>
          </button>
        ) : (
          <>
            <button
              onClick={() => { setView("playlists"); setSearchQuery(""); }}
              className={`px-3 py-2 text-[8px] tracking-widest uppercase transition-colors border-b-2 ${view === "playlists" ? "text-accent-400/80 border-accent-400/50" : "text-accent-400/25 border-transparent hover:text-accent-400/50"}`}
            >
              Library
            </button>
            <button
              onClick={openLiked}
              className={`flex items-center gap-1 px-3 py-2 text-[8px] tracking-widest uppercase transition-colors border-b-2 ${view === "liked" ? "text-accent-400/80 border-accent-400/50" : "text-accent-400/25 border-transparent hover:text-accent-400/50"}`}
            >
              <Heart size={9} />
              Liked
            </button>
            <button
              onClick={openRecent}
              className={`px-3 py-2 text-[8px] tracking-widest uppercase transition-colors border-b-2 ${view === "recent" ? "text-accent-400/80 border-accent-400/50" : "text-accent-400/25 border-transparent hover:text-accent-400/50"}`}
            >
              Recent
            </button>
            <button
              onClick={openQueue}
              className={`px-3 py-2 text-[8px] tracking-widest uppercase transition-colors border-b-2 ${view === "queue" ? "text-accent-400/80 border-accent-400/50" : "text-accent-400/25 border-transparent hover:text-accent-400/50"}`}
            >
              Queue
            </button>
          </>
        )}

        {/* Search input */}
        <div className="flex-1 flex items-center gap-1.5 px-3 py-1.5">
          <Search size={10} className="text-accent-400/25 shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value) setView("search"); }}
            placeholder="Search tracks..."
            className="flex-1 bg-transparent text-[9px] text-accent-400/70 placeholder:text-accent-400/20 tracking-wider focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(""); setView("playlists"); }} className="text-accent-400/25 hover:text-accent-300 transition-colors text-[9px]">✕</button>
          )}
        </div>
      </div>

      {/* Section title */}
      {(view === "tracks" || view === "liked" || view === "recent") && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-accent-500/10">
          {selectedPlaylist?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selectedPlaylist.image} alt="" className="w-8 h-8 object-cover border border-accent-500/20 shrink-0" />
          )}
          {!selectedPlaylist && view === "liked" && <Heart size={14} className="text-accent-400/40" />}
          {view === "recent" && <Monitor size={14} className="text-accent-400/40" />}
          <div>
            <div className="text-[9px] text-accent-400/70 tracking-widest uppercase truncate">
              {view === "liked" ? "Liked Songs" : view === "recent" ? "Recently Played" : selectedPlaylist?.name}
            </div>
            <div className="text-[7px] text-accent-400/25 tracking-widest">
              {tracks.length} tracks
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="overflow-y-auto" style={{ maxHeight: "52vh" }}>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <span className="text-[8px] tracking-[0.3em] uppercase text-accent-400/20 animate-pulse">Loading...</span>
          </div>
        )}

        {/* Playlists grid */}
        {view === "playlists" && !loading && (
          <div className="p-3 grid grid-cols-2 gap-2">
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => openPlaylist(pl)}
                className="flex items-center gap-2.5 p-2 border border-accent-500/10 hover:border-accent-500/30 hover:bg-accent-500/5 transition-colors text-left"
              >
                {pl.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pl.image} alt="" className="w-10 h-10 object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 bg-accent-500/10 flex items-center justify-center shrink-0">
                    <Music size={14} className="text-accent-400/30" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-[9px] text-white/70 truncate leading-tight">{pl.name}</div>
                  <div className="text-[7px] text-accent-400/25 tracking-widest mt-0.5">{pl.total} tracks</div>
                </div>
              </button>
            ))}
            {!loading && playlists.length === 0 && (
              <div className="col-span-2 text-center py-6 text-[8px] text-accent-400/20 tracking-widest">
                No playlists found — re-authorize at /api/spotify/login
              </div>
            )}
          </div>
        )}

        {/* Queue view */}
        {view === "queue" && !loading && (
          <div className="py-1">
            {queue.currentlyPlaying && (
              <>
                <div className="px-4 py-1.5 text-[7px] text-accent-400/30 tracking-[0.25em] uppercase border-b border-accent-500/10">Now Playing</div>
                <TrackRow
                  track={queue.currentlyPlaying}
                  playing={true}
                  onPlay={() => {}}
                  onQueue={() => control("queue", { uri: queue.currentlyPlaying!.uri })}
                />
              </>
            )}
            {queue.queue.length > 0 && (
              <div className="px-4 py-1.5 text-[7px] text-accent-400/30 tracking-[0.25em] uppercase border-b border-accent-500/10">Up Next</div>
            )}
            {queue.queue.length === 0 && !queue.currentlyPlaying && (
              <div className="text-center py-6 text-[8px] text-accent-400/20 tracking-widest">Queue is empty</div>
            )}
            {queue.queue.map((t) => (
              <TrackRow
                key={`${t.uri}-${t.idx}`}
                track={t}
                playing={false}
                onPlay={() => control("play_uri", { uri: t.uri })}
                onQueue={() => control("queue", { uri: t.uri })}
              />
            ))}
          </div>
        )}

        {/* Track list (playlist, liked, recent, search) */}
        {(view === "tracks" || view === "liked" || view === "recent" || view === "search") && !loading && (
          <div className="py-1">
            {trackError && (
              <div className="text-center py-6 px-4 text-[8px] text-red-400/40 tracking-widest">{trackError}</div>
            )}
            {view === "search" && searchQuery && searchResults.length === 0 && (
              <div className="text-center py-6 text-[8px] text-accent-400/20 tracking-widest">No results</div>
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

// ── Miniplayer ────────────────────────────────────────────────────────────────

function SpotifyMiniplayer({
  track, onRestore, onClose,
}: {
  track: TrackData | null;
  onRestore: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed z-[60] select-none overflow-hidden"
      style={{ bottom: 20, right: 20, width: 160, height: 160, background: "#07111a", border: "0.5px solid color-mix(in srgb, var(--ac-solid) 25%, transparent)" }}
    >
      {/* Album art fills the square */}
      {track?.albumArt ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={track.albumArt} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Music size={28} className="text-accent-400/20" />
        </div>
      )}

      {/* Gradient overlay — darker at bottom for controls */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.35) 100%)" }} />

      {/* Top-right: restore + close */}
      <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
        <button onClick={onRestore} className="text-white/50 hover:text-white transition-colors p-1" style={{ background: "rgba(0,0,0,0.4)" }} title="Restore widget">
          <Maximize2 size={9} />
        </button>
        <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-1" style={{ background: "rgba(0,0,0,0.4)" }} title="Close miniplayer">
          <X size={9} />
        </button>
      </div>

      {/* Bottom: prev / play-pause / next */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-5 py-3">
        {track?.playing !== undefined ? (
          <>
            <button onClick={() => control("previous")} className="text-white/60 hover:text-white transition-colors">
              <SkipBack size={14} />
            </button>
            <button onClick={() => control(track.playing ? "pause" : "play")} className="text-white hover:text-accent-300 transition-colors">
              {track.playing ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button onClick={() => control("next")} className="text-white/60 hover:text-white transition-colors">
              <SkipForward size={14} />
            </button>
          </>
        ) : (
          <span className="text-[7px] text-white/30 tracking-widest">NOTHING PLAYING</span>
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
  const [miniOpen, setMiniOpen]     = useState(false);
  useHudShortcut("hud:open-spotify", () => setExpandOpen(true));

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
  const currentUri = track?.uri ?? null;

  const handleSeek = (ms: number) => {
    setLiveProgress(ms);
    control("seek", { value: ms });
  };

  const actions = (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setMiniOpen(v => !v)}
        className="transition-colors p-0.5"
        style={{ color: miniOpen ? "var(--ac-solid)" : undefined }}
        title={miniOpen ? "Disable miniplayer" : "Enable miniplayer"}
      >
        <PictureInPicture2 size={11} className={miniOpen ? "" : "text-accent-400/30 hover:text-accent-300"} />
      </button>
      <button onClick={() => setExpandOpen(true)} className="text-accent-400/30 hover:text-accent-300 transition-colors p-0.5">
        <ArrowUpRight size={11} />
      </button>
    </div>
  );

  return (
    <>
      <HudModal isOpen={expandOpen} onClose={() => setExpandOpen(false)} title="SPOTIFY — LIBRARY" width="520px">
        <LibraryContent currentUri={currentUri} />
      </HudModal>

      {miniOpen && (
        <SpotifyMiniplayer
          track={track}
          onRestore={() => setMiniOpen(false)}
          onClose={() => setMiniOpen(false)}
        />
      )}

      {/* Compact header-only strip when miniplayer is active */}
      {miniOpen && (
        <div className="relative bg-[#0a1620] border border-accent-500/20 px-3 py-2">
          <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-accent-400" />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-accent-400" />
          <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-accent-400" />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-accent-400" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[9px] text-accent-400/50 tracking-[0.3em] uppercase">
              <Music size={10} className="text-accent-400/60 shrink-0" />
              <span>SPOTIFY</span>
            </div>
            {actions}
          </div>
        </div>
      )}

      {!miniOpen && <HudPanel title="SPOTIFY" icon={<Music size={10} />} actions={actions}>
        {error && (
          <div className="text-[9px] text-amber-400/50 tracking-wider">
            Add SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET to .env.local
          </div>
        )}

        {notAuthed && !error && (
          <div className="text-[9px] text-amber-400/50 tracking-wider">
            Visit{" "}
            <a href="/api/spotify/login" target="_blank" className="text-accent-400 underline">
              /api/spotify/login
            </a>{" "}
            to connect
          </div>
        )}

        {!error && !notAuthed && !track?.playing && (
          <div className="flex items-center gap-2 text-[10px] text-accent-400/30">
            <Music size={14} className="opacity-40" />
            <span className="tracking-widest">NOTHING PLAYING</span>
          </div>
        )}

        {track?.playing && track.trackName && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {track.albumArt ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={track.albumArt} alt={track.album} className="w-10 h-10 shrink-0 border border-accent-500/20" />
              ) : (
                <div className="w-10 h-10 shrink-0 bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
                  <Music size={14} className="text-accent-400/40" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs text-white font-medium truncate leading-tight">{track.trackName}</div>
                <div className="text-[10px] text-accent-400/60 truncate mt-0.5">{track.artist}</div>
                <div className="text-[9px] text-accent-400/30 truncate">{track.album}</div>
              </div>
            </div>

            {track.durationMs ? (
              <div className="space-y-1">
                <div
                  className="h-1 bg-accent-500/10 rounded-full overflow-hidden cursor-pointer group"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    handleSeek(Math.round(fraction * (track.durationMs ?? 0)));
                  }}
                >
                  <div className="h-full bg-accent-400/60 group-hover:bg-accent-400/80 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-[8px] text-accent-400/25">
                  <span>{fmtMs(liveProgress)}</span>
                  <span>{fmtMs(track.durationMs)}</span>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-center gap-5 pt-1">
              <button onClick={() => control("previous")} className="text-accent-400/40 hover:text-accent-300 transition-colors">
                <SkipBack size={14} />
              </button>
              <button
                onClick={() => control(track.playing ? "pause" : "play")}
                className="text-accent-400/70 hover:text-accent-300 transition-colors border border-accent-500/30 hover:border-accent-400/60 rounded-sm p-1"
              >
                {track.playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button onClick={() => control("next")} className="text-accent-400/40 hover:text-accent-300 transition-colors">
                <SkipForward size={14} />
              </button>
            </div>
          </div>
        )}
      </HudPanel>}
    </>
  );
}
