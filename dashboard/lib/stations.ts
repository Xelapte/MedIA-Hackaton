import rawStations from "./stations.json";

export interface RadioStation {
  id: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  name: string;
  language: string;
  streamUrl: string;
  active: boolean;
}

export const STATIONS: RadioStation[] = rawStations as RadioStation[];

export function getStation(id: string): RadioStation | undefined {
  return STATIONS.find((s) => s.id === id);
}

export function stationsByCountry(stations: RadioStation[] = STATIONS): [string, RadioStation[]][] {
  const map = new Map<string, RadioStation[]>();
  for (const station of stations) {
    const list = map.get(station.country) ?? [];
    list.push(station);
    map.set(station.country, list);
  }
  return Array.from(map.entries());
}

// Country codes here are all two-letter ISO 3166-1 alpha-2, which map directly
// to flag emoji via the regional indicator symbol block (U+1F1E6 = 'A').
export function countryFlag(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + (c.charCodeAt(0) - 65)))
    .join("");
}
