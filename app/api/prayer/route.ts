// Aladhan API — free, no key required.
// method=3  = Muslim World League (standard for NL mosques)
// latitudeAdjustmentMethod=2 = Seventh of the Night (Fajr = Sunrise−Night/7, Isha = Sunset+Night/7)
// This gives ~04:16 Fajr / ~23:04 Isha in Amsterdam in June — matches Dutch mosque times.
export async function GET() {
  const now = new Date();
  const timestamp = Math.floor(now.getTime() / 1000);

  const url =
    `https://api.aladhan.com/v1/timings/${timestamp}` +
    `?latitude=52.3676&longitude=4.9041&method=3&latitudeAdjustmentMethod=2`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    return Response.json({ error: "Aladhan request failed" }, { status: 502 });
  }

  const json = await res.json();
  const t = json?.data?.timings;
  if (!t) {
    return Response.json({ error: "Unexpected Aladhan response" }, { status: 502 });
  }

  return Response.json({
    fajr:    t.Fajr,
    sunrise: t.Sunrise,
    dhuhr:   t.Dhuhr,
    asr:     t.Asr,
    maghrib: t.Maghrib,
    isha:    t.Isha,
  });
}
