
function parseDepartures(data: unknown, targetLine: string, tpcCode: string, targetDest: string) {
  if (typeof data !== "object" || data === null) return null;
  const obj = data as Record<string, unknown>;

  const stopData = obj[tpcCode] as Record<string, unknown>;
  const passes = stopData?.Passes as Record<string, unknown> | undefined;
  if (!passes) return null;

  const now = Date.now();
  const departures = Object.values(passes)
    .map((p) => {
      const pass = p as Record<string, unknown>;
      if (String(pass.LinePublicNumber ?? "") !== targetLine) return null;

      // Skip arrivals where boarding isn't allowed (terminus logic)
      if (pass.GetIn === false) return null;

      const dest = String(pass.DestinationName50 ?? pass.DestinationName ?? "");
      
      // Strict destination direction filtering
      if (!dest.toLowerCase().includes(targetDest.toLowerCase())) return null;

      const timeStr = String(pass.ExpectedDepartureTime ?? pass.TargetDepartureTime ?? "");
      if (!timeStr) return null;

      const dt = new Date(timeStr);
      const minutes = Math.round((dt.getTime() - now) / 60000);
      
      if (minutes < 0) return null;

      return {
        dest,
        minutes,
        scheduled: dt.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a!.minutes - b!.minutes)
    .slice(0, 5) as { dest: string; minutes: number; scheduled: string }[];

  return departures.length > 0 ? departures : null;
}

// Night fallback: Generates 5 sequential custom intervals starting from 05:30
function getNextScheduledServiceSequence(line: string, dest: string, isBus: boolean) {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();

  // Weekend service adjustments: GVB Saturday timetables start at roughly 06:00
  const firstHour = 6;
  const firstMin = 0;
  
  // Stagger frequencies so your widgets have unique structural values
  let frequencyMinutes = 10;
  if (line === "13") frequencyMinutes = 12; // Tram 13 spacing offset
  if (isBus) frequencyMinutes = 15;         // Airport Bus 369 spacing offset

  let baseDeparture: Date;
  if (h < firstHour || (h === firstHour && m < firstMin)) {
    baseDeparture = new Date(now);
    baseDeparture.setHours(firstHour, firstMin, 0, 0);
  } else {
    baseDeparture = new Date(now);
    baseDeparture.setDate(baseDeparture.getDate() + 1);
    baseDeparture.setHours(firstHour, firstMin, 0, 0);
  }

  const generatedDepartures = [];
  for (let i = 0; i < 5; i++) {
    const currentTramTime = new Date(baseDeparture.getTime() + i * frequencyMinutes * 60000);
    const minutes = Math.round((currentTramTime.getTime() - now.getTime()) / 60000);
    const scheduled = currentTramTime.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
    
    generatedDepartures.push({ dest, minutes, scheduled });
  }

  return generatedDepartures;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const TPC = searchParams.get("tpc") || "30003176";
  const LINE = searchParams.get("line") || "7";
  const DEST = searchParams.get("dest") || "Plantage Parklaan";
  const IS_BUS = searchParams.get("type") === "bus";

  try {
    const depRes = await fetch(`http://v0.ovapi.nl/tpc/${TPC}`, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "HUDDashboard/1.0 (alib181220@gmail.com)",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (depRes.ok) {
      const depData = await depRes.json();
      const departures = parseDepartures(depData, LINE, TPC, DEST);
      if (departures) {
        return Response.json({ departures, live: true });
      }
    }
  } catch (error) {
    console.error("OVapi Fetch Exception:", error);
  }

  // Pass LINE through here to generate distinct values
  return Response.json({ 
    departures: getNextScheduledServiceSequence(LINE, DEST, IS_BUS), 
    live: false 
  });
}
