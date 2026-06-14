// OpenWeatherMap API types
// https://openweathermap.org/api/one-call-3 / data/2.5

// ── Shared ────────────────────────────────────────────────────────────────────

export interface OWMWeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface OWMMainMetrics {
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  pressure: number;
  humidity: number;
}

export interface OWMWind {
  speed: number;
  deg?: number;
  gust?: number;
}

// ── Current weather (/data/2.5/weather) ──────────────────────────────────────

export interface OWMCurrentWeather {
  dt: number;
  name: string;
  main: OWMMainMetrics;
  weather: OWMWeatherCondition[];
  wind: OWMWind;
  clouds?: { all: number };
  visibility?: number;
  uvi?: number;
  sys: {
    type?: number;
    id?: number;
    country?: string;
    sunrise: number;
    sunset: number;
  };
}

// ── Forecast (/data/2.5/forecast) ────────────────────────────────────────────

export interface OWMForecastItem {
  dt: number;
  main: OWMMainMetrics;
  weather: OWMWeatherCondition[];
  clouds?: { all: number };
  wind?: OWMWind;
  pop?: number;
  rain?: { "3h"?: number };
  snow?: { "3h"?: number };
  dt_txt: string;
}

export interface OWMForecast {
  cod: string;
  message: number;
  cnt: number;
  list: OWMForecastItem[];
  city: {
    id: number;
    name: string;
    country: string;
    timezone: number;
    sunrise: number;
    sunset: number;
  };
}
