import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  isArray: (name) => ["response", "propstat", "comp"].includes(name),
});

// ── XML helpers ───────────────────────────────────────────────────────────────

function dig(obj: unknown, ...keys: string[]): unknown {
  let cur: unknown = obj;
  for (const k of keys) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

function deepFind(obj: unknown, key: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  const rec = obj as Record<string, unknown>;
  if (rec[key] !== undefined) return rec[key];
  for (const v of Object.values(rec)) {
    const found = deepFind(v, key);
    if (found !== undefined) return found;
  }
  return undefined;
}

function toArr<T>(v: T | T[] | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

// ── DAV request helper ────────────────────────────────────────────────────────

async function dav(
  url: string,
  method: string,
  auth: string,
  body: string,
  extraHeaders: Record<string, string> = {}
): Promise<{ status: number; text: string; finalUrl: string }> {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/xml; charset=utf-8",
      Accept: "text/xml, application/xml",
      ...extraHeaders,
    },
    body,
    redirect: "follow",
  });
  return { status: res.status, text: await res.text(), finalUrl: res.url };
}

function makeAuth(appleId: string, appPassword: string) {
  return Buffer.from(`${appleId}:${appPassword}`).toString("base64");
}

// ── iCal parser ───────────────────────────────────────────────────────────────

export type CalDavEvent = {
  id:      string;
  title:   string;
  dateKey: string;
  endDateKey: string;
  time:    string;
  allDay:  boolean;
};

function unfoldLines(raw: string): string[] {
  return raw.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
}

function icsDateToKey(s: string): string {
  const clean = s.replace(/^[^:]+:/, "").replace("Z", "");
  return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
}

function icsDateToTime(s: string): string {
  const clean = s.replace(/^[^:]+:/, "");
  if (!clean.includes("T")) return "";
  const t = clean.replace("Z", "");
  return `${t.slice(9, 11)}:${t.slice(11, 13)}`;
}

function parseICS(icsData: string): CalDavEvent[] {
  const events: CalDavEvent[] = [];
  const lines  = unfoldLines(icsData);
  let inEvent  = false;
  let cur: Record<string, string> = {};

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { inEvent = true; cur = {}; continue; }
    if (line === "END:VEVENT") {
      inEvent = false;
      if (cur.SUMMARY && (cur.DTSTART || cur["DTSTART;VALUE=DATE"])) {
        const start = cur.DTSTART ?? cur["DTSTART;VALUE=DATE"] ?? "";
        const end   = cur.DTEND   ?? cur["DTEND;VALUE=DATE"]   ?? start;
        events.push({
          id:         cur.UID || String(Date.now() + Math.random()),
          title:      cur.SUMMARY,
          dateKey:    icsDateToKey(start),
          endDateKey: icsDateToKey(end),
          time:       icsDateToTime(start),
          allDay:     !start.includes("T"),
        });
      }
      continue;
    }
    if (!inEvent) continue;
    const col = line.indexOf(":");
    if (col < 0) continue;
    const rawKey = line.slice(0, col);
    const val    = line.slice(col + 1);
    // Use full key (with params like DTSTART;TZID=...) as key but also the base name
    const baseKey = rawKey.split(";")[0];
    cur[baseKey]  = val;
    if (rawKey !== baseKey) cur[rawKey] = val; // keep params key too
  }

  return events;
}

// ── CalDAV discovery + fetch ──────────────────────────────────────────────────

async function fetchCalDavEvents(appleId: string, appPassword: string): Promise<CalDavEvent[]> {
  const auth = makeAuth(appleId, appPassword);

  // Step 1: discover current-user-principal
  const step1Body = `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop><D:current-user-principal/></D:prop>
</D:propfind>`;

  const r1 = await dav(
    "https://caldav.icloud.com/.well-known/caldav",
    "PROPFIND",
    auth,
    step1Body,
    { Depth: "0" }
  );

  if (r1.status === 401) throw new Error("Invalid credentials");
  if (r1.status >= 400 && r1.status !== 207) throw new Error(`Discovery failed: ${r1.status}`);

  const x1   = parser.parse(r1.text);
  let principalHref = deepFind(deepFind(x1, "current-user-principal"), "href") as string | undefined;
  const baseUrl = new URL(r1.finalUrl).origin;

  if (!principalHref) {
    // Some iCloud servers return the principal directly at the redirected URL
    principalHref = r1.finalUrl;
  }

  if (!principalHref.startsWith("http")) {
    principalHref = baseUrl + principalHref;
  }

  // Step 2: get calendar-home-set
  const step2Body = `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop><C:calendar-home-set/></D:prop>
</D:propfind>`;

  const r2 = await dav(principalHref, "PROPFIND", auth, step2Body, { Depth: "0" });
  const x2 = parser.parse(r2.text);
  let calHomeHref = deepFind(deepFind(x2, "calendar-home-set"), "href") as string | undefined;

  if (!calHomeHref) throw new Error("Could not discover calendar home");
  if (!calHomeHref.startsWith("http")) calHomeHref = baseUrl + calHomeHref;

  // Step 3: list calendars (depth 1)
  const step3Body = `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:displayname/>
    <D:resourcetype/>
    <C:supported-calendar-component-set/>
  </D:prop>
</D:propfind>`;

  const r3  = await dav(calHomeHref, "PROPFIND", auth, step3Body, { Depth: "1" });
  const x3  = parser.parse(r3.text);
  const responses = toArr(deepFind(x3, "response") as unknown[] | undefined);

  const calUrls = responses
    .filter(r => {
      const comps = toArr(deepFind(deepFind(r, "supported-calendar-component-set"), "comp") as unknown[] | undefined);
      return comps.some((c) => (c as { "@_name"?: string })?.["@_name"] === "VEVENT");
    })
    .map(r => {
      const h = deepFind(r, "href") as string | undefined;
      return h ? (h.startsWith("http") ? h : baseUrl + h) : null;
    })
    .filter((h): h is string => !!h && h !== calHomeHref);

  // Step 4: REPORT each calendar for events in a rolling window
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end   = new Date(now.getFullYear(), now.getMonth() + 4, 1);
  const fmt   = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const reportBody = `<?xml version="1.0" encoding="utf-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${fmt(start)}" end="${fmt(end)}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;

  const allEvents: CalDavEvent[] = [];

  for (const calUrl of calUrls.slice(0, 15)) {
    try {
      const rr  = await dav(calUrl, "REPORT", auth, reportBody, { Depth: "1" });
      if (rr.status >= 400) continue;
      const xx  = parser.parse(rr.text);
      const evs = toArr(deepFind(xx, "response") as unknown[] | undefined);
      for (const ev of evs) {
        const calData = deepFind(ev, "calendar-data") as string | undefined;
        if (calData) allEvents.push(...parseICS(String(calData)));
      }
    } catch { /* skip failed calendars */ }
  }

  return allEvents;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { appleId, appPassword, probe } = await req.json();

    if (!appleId || !appPassword) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const events = await fetchCalDavEvents(String(appleId), String(appPassword));

    if (probe) {
      return NextResponse.json({ ok: true, count: events.length });
    }

    return NextResponse.json({ events });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = msg.includes("Invalid credentials") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
