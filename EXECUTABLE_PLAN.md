# HUD Dashboard — Executable Distribution Plan

> **Status:** Planning only. No implementation started.  
> Read this file at the start of the packaging session to restore full context.

---

## Goal

Package the HUD dashboard as a standalone desktop application that anyone can install
and run without prior technical knowledge. The app should:

- Run on macOS, Windows, and Linux from a single installer per platform
- Guide new users through all required setup via an ARIA-powered onboarding screen
- Automatically handle Ollama download/install (with user permission)
- Walk users through any manual steps (Spotify, API keys) with clear instructions
- Store all user config locally on their machine

---

## Packaging Approach: Electron via `nextron`

**Tool:** [`nextron`](https://github.com/saltyshiomix/nextron) — a thin wrapper that pairs
Next.js with Electron. The Next.js dev server or built output runs inside an Electron shell.

**Why Electron:**
- Bundles Node.js + Chromium — no runtime dependency on the user's machine
- Single clickable installer (`.dmg` / `.exe` / `.AppImage`)
- Proven with Next.js App Router projects
- Supports native OS APIs (file system, process spawning for Ollama)

**Output sizes (approximate):**
- macOS `.dmg`: ~200 MB
- Windows `.exe` (NSIS installer): ~170 MB
- Linux `.AppImage`: ~180 MB

**Separate builds per platform** — CI (GitHub Actions) can automate cross-platform builds
via `electron-builder`.

---

## Ollama Auto-Install (with permission)

The startup screen will detect whether Ollama is already running on the user's machine.
If not, it asks permission and then handles installation automatically.

### Detection
```
GET http://localhost:11434/api/version  →  200 OK = Ollama running
                                        →  connection refused = not running/not installed
```

### Auto-install flow (permission required)
1. Startup screen shows: *"ARIA needs Ollama to run. Download and install it automatically? (~500 MB installer + ~4.7 GB model)"*
2. User clicks **Allow**.
3. A background script runs:
   - **macOS:** `curl -fsSL https://ollama.ai/install.sh | sh` or download the `.pkg` and open it
   - **Windows:** Download `OllamaSetup.exe` from `https://ollama.ai/download/windows`, run silently with `/S` flag via `child_process.execFile`
   - **Linux:** `curl -fsSL https://ollama.ai/install.sh | sh`
4. After Ollama installs, the script runs: `ollama pull qwen2.5:7b` (streams progress to the onboarding UI)
5. Model pull progress is shown as a progress bar in the ARIA onboarding screen.
6. Once done, Ollama is started and the onboarding continues.

### If already installed but not running
- The app starts Ollama automatically on launch (same as current `start.sh` logic) using `child_process.spawn("ollama", ["serve"])`.
- On app close, it kills the Ollama process it started (only if the app started it — don't kill a user's pre-existing instance).

### Model choice
- Default: `qwen2.5:7b` (~4.7 GB, good balance of quality and hardware requirements)
- Onboarding could offer: `qwen2.5:3b` (~2 GB, for low-RAM machines) or `qwen2.5:14b` (~9 GB, for power users)
- Store chosen model name in local config as `ollama.model`

---

## Onboarding Screen Design

Triggered on first launch (when no config file exists at the user's app data path).
Powered by the ARIA agent in a fullscreen Signal-design modal.

ARIA greets the user and collects setup info conversationally, with structured form steps
for anything that requires precise input (API keys, URLs).

### Onboarding Steps (in order)

#### Step 1 — Welcome + Ollama
- ARIA greets the user by asking their name
- Detects Ollama status → prompts to install if needed
- Shows download/model-pull progress

#### Step 2 — Personal Info
- **Name** (used by ARIA for greetings)
- **Location** (city or city + country) → used for Weather widget and Prayer Times widget
- **Timezone** (auto-detected, user can override)

#### Step 3 — Widget Selection
User picks which widgets to enable. Disabled widgets are hidden from the dashboard.
All can be toggled later in Settings.

| Widget | Requires setup? |
|---|---|
| Clock | No |
| Weather | OpenWeather API key + location |
| Spotify Now Playing | Full Spotify OAuth setup |
| GitHub Activity | GitHub username + optional token |
| Prayer Times | Location only (already collected) |
| News | NewsAPI key |
| Habit Tracker | No |
| Pomodoro | No |
| Mood Tracker | No |
| Finance / Crypto | No (uses public CoinGecko API) |
| System Monitor | No |
| Scratchpad | No |
| Calendar (CalDAV) | CalDAV server URL + credentials |
| ARIA Agent | Requires Ollama (step 1) |

#### Step 4 — Theme / Appearance
- **Accent color:** teal `#1dd8c8` (default, user can change)
- **Background:** dark navy `#07111a` (default)
- **Layout:** drag-to-reorder is available after setup; default layout is chosen here
- **ARIA design:** Signal (already the preferred design — pre-selected)

#### Step 5 — API Key Setup (per enabled widget)

Each key is collected with a short ARIA explanation of how to get it, plus a "Test" button
that hits the API and confirms it works before saving.

**Weather — OpenWeather**
- Free tier is sufficient
- ARIA explains: go to openweathermap.org → sign up → API Keys tab → copy default key
- Env var: `OPENWEATHER_API_KEY`

**News — NewsAPI**
- Free tier: 100 req/day (sufficient for this use case)
- ARIA explains: go to newsapi.org → Get API Key → copy key
- Env var: `NEWS_API_KEY`
- Also ask: preferred news source/topic (stored in config, passed to news route)

**GitHub Activity**
- Username: required (no key needed for public repos)
- Personal Access Token: optional, needed only for private repo activity
- Env vars: `GITHUB_USERNAME`, `GITHUB_TOKEN`

**Spotify — full guided flow** (see section below)

**CalDAV Calendar** (if enabled)
- CalDAV server URL
- Username + password
- ARIA explains common providers: iCloud, Google, Nextcloud, etc.

#### Step 6 — Done
- ARIA summarises what was set up
- Dashboard loads with all enabled widgets
- Config saved to disk

---

## Spotify Setup Flow (step-by-step guided)

Spotify requires the most manual steps. ARIA walks through it with screenshots/diagrams
shown inline.

1. **Go to** https://developer.spotify.com/dashboard → Log in → **Create App**
2. App name: anything (e.g. "My HUD")
3. Redirect URI: `http://127.0.0.1:3000/api/spotify/callback` (pre-filled, user just copies it in)
4. Enable: Web API (tick the checkbox)
5. Copy **Client ID** and **Client Secret** → paste into onboarding form
6. Click **Connect Spotify** → opens the Spotify authorization page in the system browser
7. User authorizes → callback saves the refresh token automatically
8. Onboarding shows: "Spotify connected ✓"

Scopes requested (pre-configured, user doesn't need to touch these):
```
user-read-currently-playing
user-read-playback-state
user-modify-playback-state
playlist-read-private
playlist-read-collaborative
user-library-read
user-read-recently-played
```

---

## Config Storage

All user config is stored in a single JSON file at the OS-standard app data location
(managed by Electron's `app.getPath("userData")`):

```
macOS:   ~/Library/Application Support/hud-dashboard/config.json
Windows: %APPDATA%\hud-dashboard\config.json
Linux:   ~/.config/hud-dashboard/config.json
```

The `.env.local` file approach used in dev is replaced by this config file in production.
Electron's main process reads the config and injects values as environment variables
before the Next.js server starts, so all existing API routes work unchanged.

### Config schema (draft)
```json
{
  "user": {
    "name": "Kirfa",
    "location": "London, UK",
    "timezone": "Europe/London"
  },
  "widgets": {
    "weather": true,
    "spotify": true,
    "github": true,
    "prayer": true,
    "news": true,
    "habits": true,
    "pomodoro": true,
    "mood": true,
    "finance": true,
    "system": true,
    "scratchpad": true,
    "calendar": false,
    "aria": true
  },
  "theme": {
    "accent": "#1dd8c8",
    "background": "#07111a",
    "ariaDesign": "signal"
  },
  "ollama": {
    "model": "qwen2.5:7b",
    "url": "http://localhost:11434"
  },
  "keys": {
    "openweather": "",
    "newsapi": "",
    "githubToken": "",
    "githubUsername": "",
    "spotifyClientId": "",
    "spotifyClientSecret": "",
    "spotifyRefreshToken": "",
    "caldavUrl": "",
    "caldavUser": "",
    "caldavPass": ""
  },
  "news": {
    "preferredSource": "",
    "preferredTopic": "general"
  },
  "onboardingComplete": true
}
```

---

## Owner Preferences (pre-fill for owner's own installs)

When building for personal use, these values can be pre-baked into a `config.defaults.json`
so the owner skips onboarding entirely:

- **Name:** Kirfa
- **ARIA design:** Signal (teal `#1dd8c8` / navy `#07111a`)
- **Ollama model:** `qwen2.5:7b`
- **Widgets enabled:** all (based on current dashboard state)
- All API keys are in the owner's `.env.local` — those values get written to `config.json`
  at build time for personal installs (do NOT include in public repo or shared build)

---

## Build & Distribution

### Scripts to add to `package.json`
```json
"scripts": {
  "electron:dev": "nextron",
  "electron:build": "nextron build",
  "electron:build:mac": "nextron build --mac",
  "electron:build:win": "nextron build --win",
  "electron:build:linux": "nextron build --linux"
}
```

### GitHub Actions (optional, for automated cross-platform builds)
- macOS runner builds `.dmg`
- Windows runner builds `.exe`
- Linux runner builds `.AppImage`
- Artifacts uploaded to GitHub Releases

### USB stick distribution
- The installer file goes on the USB. User runs it once to install, then the app is on their machine.
- The app is NOT designed to run directly from the USB (Electron apps install to the OS).
- If "truly portable" (run from USB without installing) is needed, that requires a different
  approach (portable Electron build with a launcher script) — note this as a stretch goal.

---

## Known Constraints & Gotchas

1. **Ollama model size:** The `qwen2.5:7b` model is ~4.7 GB. First-time users need a good
   internet connection and patience. Show accurate progress and time estimates.

2. **Spotify per-user OAuth:** Every user must create their own Spotify app. This cannot be
   worked around due to Spotify's ToS. The guided flow minimises friction but can't eliminate it.

3. **Windows path separators:** Any hardcoded paths in API routes or scripts need
   `path.join()` / `path.resolve()` — not forward-slash strings.

4. **Port conflicts:** The embedded Next.js server runs on port 3000 by default. Add logic
   to find a free port on startup if 3000 is occupied.

5. **macOS Gatekeeper:** Unsigned `.dmg` files show a security warning. For wider distribution,
   the app should be signed with an Apple Developer certificate ($99/yr) or users need to
   right-click → Open to bypass Gatekeeper.

6. **Linux Ollama install requires `sudo`** for the install script. The onboarding should
   detect this and open a terminal prompt asking for the password, or instruct the user to
   run the install script manually.

---

## Implementation Order (when ready)

1. Install and configure `nextron` + `electron-builder`
2. Move env-var loading from `.env.local` to the Electron main process reading `config.json`
3. Build the onboarding screen component (ARIA-powered, Signal design)
4. Write the Ollama detection + install script (platform-specific)
5. Wire up config persistence (read/write `config.json`)
6. Test onboarding end-to-end on a clean machine / VM
7. Set up `electron-builder` targets and build distributables
8. (Optional) Set up GitHub Actions for automated cross-platform builds
