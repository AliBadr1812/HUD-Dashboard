const CONDITION_ICON: Record<string, string> = {
  Clear: "○",
  Clouds: "●",
  Rain: "◕",
  Drizzle: "◑",
  Thunderstorm: "●",
  Snow: "◑",
  Mist: "◑",
  Fog: "◑",
  Haze: "◑",
};

function uvLabel(index: number): string {
  if (index <= 2) return "Low";
  if (index <= 5) return "Moderate";
  if (index <= 7) return "High";
  return "Very High";
}

function windDir(deg: number): string {
  return ["N","NE","E","SE","S","SW","W","NW"][Math.round(deg / 45) % 8];
}

function fmtTime(unix: number): string {
  return new Date(unix * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });
}

export async function GET() {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return Response.json({ error: "OPENWEATHER_API_KEY not set" }, { status: 500 });
  }

  const [currentRes, forecastRes] = await Promise.all([
    fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=Amsterdam,NL&appid=${apiKey}&units=metric`,
      { next: { revalidate: 1800 } }
    ),
    fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=Amsterdam,NL&appid=${apiKey}&units=metric`,
      { next: { revalidate: 1800 } }
    ),
  ]);

  if (!currentRes.ok || !forecastRes.ok) {
    return Response.json({ error: "OpenWeatherMap request failed" }, { status: 502 });
  }

  const current = await currentRes.json();
  const forecast = await forecastRes.json();

  // One reading per day at noon
  const seen = new Set<string>();
  const daily = forecast.list
    .filter((item: any) => {
      const day = new Date(item.dt * 1000).toLocaleDateString("en-US", { weekday: "short" });
      if (seen.has(day)) return false;
      seen.add(day);
      return true;
    })
    .slice(0, 7)
    .map((item: any) => ({
      day: new Date(item.dt * 1000)
        .toLocaleDateString("en-US", { weekday: "short" })
        .toUpperCase(),
      temp: Math.round(item.main.temp),
      icon: CONDITION_ICON[item.weather[0].main] ?? "○",
    }));

  const hourly = forecast.list.slice(0, 8).map((item: any) => ({
    time: fmtTime(item.dt),
    temp: Math.round(item.main.temp),
    icon: CONDITION_ICON[item.weather[0].main] ?? "○",
    rain: Math.round((item.pop ?? 0) * 100),
  }));

  return Response.json({
    temp: Math.round(current.main.temp),
    feelsLike: Math.round(current.main.feels_like),
    tempMin: Math.round(current.main.temp_min),
    tempMax: Math.round(current.main.temp_max),
    condition: current.weather[0].description.replace(/\b\w/g, (c: string) => c.toUpperCase()),
    humidity: current.main.humidity,
    wind: Math.round(current.wind.speed * 3.6),
    windDir: windDir(current.wind.deg ?? 0),
    pressure: current.main.pressure,
    visibility: Math.round((current.visibility ?? 10000) / 1000),
    cloudCover: current.clouds?.all ?? 0,
    uv: uvLabel(current.uvi ?? 0),
    sunrise: fmtTime(current.sys.sunrise),
    sunset: fmtTime(current.sys.sunset),
    forecast: daily,
    hourly,
  });
}
