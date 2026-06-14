// Spotify Web API object types
// Derived from https://developer.spotify.com/documentation/web-api/reference/

// ── Shared primitives ─────────────────────────────────────────────────────────

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface ExternalUrls {
  spotify: string;
}

export interface ExternalIds {
  isrc?: string;
  ean?: string;
  upc?: string;
}

export interface Restrictions {
  reason: "market" | "product" | "explicit" | string;
}

export interface Followers {
  href: string | null;
  total: number;
}

export interface Paging<T> {
  href: string;
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
  items: T[];
}

export interface CursorPaging<T> {
  href: string;
  limit: number;
  next: string | null;
  cursors: { before: string; after: string };
  total?: number;
  items: T[];
}

// ── Artist ────────────────────────────────────────────────────────────────────

export interface SimplifiedArtist {
  external_urls: ExternalUrls;
  href: string;
  id: string;
  name: string;
  type: "artist";
  uri: string;
}

export interface Artist extends SimplifiedArtist {
  followers: Followers;
  genres: string[];
  images: SpotifyImage[];
  popularity: number;
}

// ── Album ─────────────────────────────────────────────────────────────────────

export type AlbumType = "album" | "single" | "compilation";
export type ReleaseDatePrecision = "year" | "month" | "day";

export interface Copyright {
  text: string;
  type: "C" | "P";
}

export interface SimplifiedAlbum {
  album_type: AlbumType;
  total_tracks: number;
  available_markets: string[];
  external_urls: ExternalUrls;
  href: string;
  id: string;
  images: SpotifyImage[];
  name: string;
  release_date: string;
  release_date_precision: ReleaseDatePrecision;
  restrictions?: Restrictions;
  type: "album";
  uri: string;
  artists: SimplifiedArtist[];
}

export interface Album extends SimplifiedAlbum {
  tracks: Paging<SimplifiedTrack>;
  copyrights: Copyright[];
  external_ids: ExternalIds;
  genres: string[];
  label: string;
  popularity: number;
}

// ── Track ─────────────────────────────────────────────────────────────────────

export interface SimplifiedTrack {
  artists: SimplifiedArtist[];
  available_markets: string[];
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  external_urls: ExternalUrls;
  href: string;
  id: string;
  is_playable?: boolean;
  linked_from?: LinkedTrack;
  restrictions?: Restrictions;
  name: string;
  preview_url: string | null;
  track_number: number;
  type: "track";
  uri: string;
  is_local: boolean;
}

export interface Track extends SimplifiedTrack {
  album: SimplifiedAlbum;
  external_ids: ExternalIds;
  popularity: number;
}

export interface LinkedTrack {
  external_urls: ExternalUrls;
  href: string;
  id: string;
  type: "track";
  uri: string;
}

// ── Playlist ──────────────────────────────────────────────────────────────────

export interface PublicUser {
  display_name: string | null;
  external_urls: ExternalUrls;
  followers?: Followers;
  href: string;
  id: string;
  images?: SpotifyImage[];
  type: "user";
  uri: string;
}

export interface PlaylistTrackObject {
  added_at: string | null;
  added_by: PublicUser | null;
  is_local: boolean;
  item: Track | null;
}

export interface SimplifiedPlaylist {
  collaborative: boolean;
  description: string | null;
  external_urls: ExternalUrls;
  href: string;
  id: string;
  images: SpotifyImage[];
  name: string;
  owner: PublicUser;
  public: boolean | null;
  snapshot_id: string;
  items: { href: string; total: number };
  type: "playlist";
  uri: string;
}

export interface Playlist extends Omit<SimplifiedPlaylist, "tracks"> {
  followers: Followers;
  tracks: Paging<PlaylistTrackObject>;
}

// ── Playback state ────────────────────────────────────────────────────────────

export type RepeatState = "off" | "track" | "context";

export interface Device {
  id: string | null;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number | null;
  supports_volume: boolean;
}

export interface PlaybackContext {
  type: "album" | "artist" | "playlist" | "show";
  href: string;
  external_urls: ExternalUrls;
  uri: string;
}

export interface PlaybackActions {
  interrupting_playback?: boolean;
  pausing?: boolean;
  resuming?: boolean;
  seeking?: boolean;
  skipping_next?: boolean;
  skipping_prev?: boolean;
  toggling_repeat_context?: boolean;
  toggling_shuffle?: boolean;
  toggling_repeat_track?: boolean;
  transferring_playback?: boolean;
}

export interface PlaybackState {
  device: Device;
  repeat_state: RepeatState;
  shuffle_state: boolean;
  context: PlaybackContext | null;
  timestamp: number;
  progress_ms: number | null;
  is_playing: boolean;
  item: Track | null;
  currently_playing_type: "track" | "episode" | "ad" | "unknown";
  actions: { disallows: PlaybackActions };
}

// ── Saved track (liked songs) ─────────────────────────────────────────────────

export interface SavedTrack {
  added_at: string;
  track: Track;
}

// ── Recently played ───────────────────────────────────────────────────────────

export interface PlayHistory {
  track: Track;
  played_at: string;
  context: PlaybackContext | null;
}

// ── Search results ────────────────────────────────────────────────────────────

export interface SearchResults {
  tracks?: Paging<Track>;
  albums?: Paging<SimplifiedAlbum>;
  artists?: Paging<Artist>;
  playlists?: Paging<SimplifiedPlaylist>;
}

// ── User profile ──────────────────────────────────────────────────────────────

export interface PrivateUser extends PublicUser {
  country: string;
  email: string;
  explicit_content: { filter_enabled: boolean; filter_locked: boolean };
  product: "premium" | "free" | "open";
}

// ── Dashboard-internal mapped types ──────────────────────────────────────────
// Simplified shapes returned by our own API routes to the frontend.

export interface DashTrack {
  idx: number;
  uri: string;
  id: string;
  name: string;
  artist: string;
  album: string;
  duration: number;
  image: string | null;
  playedAt?: string;
}

export interface DashPlaylist {
  id: string;
  uri: string;
  name: string;
  total: number;
  image: string | null;
}

export interface DashDevice {
  id: string;
  name: string;
  type: string;
  active: boolean;
  volume: number;
}

export interface DashNowPlaying {
  playing: boolean;
  uri?: string;
  trackName?: string;
  artist?: string;
  album?: string;
  albumArt?: string | null;
  progressMs?: number;
  durationMs?: number;
}

export interface DashPlaybackState {
  shuffle: boolean;
  repeat: RepeatState;
  volume: number;
}

export interface PlayerQueue {
  currently_playing: Track | null;
  queue: Track[];
}

export interface DashQueue {
  currentlyPlaying: DashTrack | null;
  queue: DashTrack[];
}
