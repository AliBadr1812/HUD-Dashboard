// Aladhan Prayer Times API types
// https://aladhan.com/prayer-times-api

export interface AladhanTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
  Firstthird: string;
  Lastthird: string;
  [key: string]: string;
}

export interface AladhanDate {
  readable: string;
  timestamp: string;
  gregorian: {
    date: string;
    day: string;
    month: { number: number; en: string };
    year: string;
  };
  hijri: {
    date: string;
    day: string;
    month: { number: number; en: string; ar: string };
    year: string;
  };
}

export interface AladhanTimingsData {
  timings: AladhanTimings;
  date: AladhanDate;
  meta: {
    latitude: number;
    longitude: number;
    timezone: string;
    method: { id: number; name: string };
    latitudeAdjustmentMethod: string;
    midnightMode: string;
    school: string;
    offset: Record<string, number>;
  };
}

export interface AladhanTimingsResponse {
  code: number;
  status: string;
  data: AladhanTimingsData;
}
