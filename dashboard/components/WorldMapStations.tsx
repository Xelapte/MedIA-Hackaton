"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, LocateFixed } from "lucide-react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
  Marker,
  Sphere,
  ZoomableGroup,
} from "react-simple-maps";
import worldGeo from "world-atlas/countries-110m.json";
import { RadioStation } from "@/lib/stations";
import { useLanguage } from "@/lib/LanguageContext";

// react-simple-maps' packaged types claim this callback receives an
// SVGElement, but at runtime ZoomableGroup actually invokes it with the
// underlying d3 pointer event (WheelEvent | MouseEvent | TouchEvent) — the
// type declaration is wrong, hence `any` here rather than fighting it.
function filterZoomEvent(rawEvent: any): boolean {
  const event = rawEvent as (WheelEvent & Partial<TouchEvent> & Partial<MouseEvent>) | undefined;
  if (!event) return false;
  // A plain wheel scroll over the map should scroll the *page*, like any
  // other embedded content — only zoom when a modifier is held, the same
  // "ctrl/cmd + scroll to zoom" convention used by most map embeds, so
  // this map never hijacks the page's scroll.
  if (event.type === "wheel") return Boolean(event.ctrlKey || event.metaKey);
  // Likewise, a single touch should scroll the page; only a two-finger
  // pinch pans/zooms the map.
  if (typeof event.type === "string" && event.type.startsWith("touch")) {
    return (event.touches?.length ?? 1) > 1;
  }
  return !event.ctrlKey && !event.button;
}

const DEFAULT_CENTER: [number, number] = [12, 22];
const DEFAULT_ZOOM = 1;
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

// Stations headquartered in the same city (e.g. three Paris stations) share
// identical lat/lng — without an offset their dots would stack exactly on
// top of each other and only the topmost would ever be clickable. Spread
// same-city stations in a small fixed ring around the true coordinate so
// every dot stays individually visible and clickable, while the underlying
// data keeps the real (unjittered) city coordinate.
function jitter(stations: RadioStation[]): (RadioStation & { jLat: number; jLng: number })[] {
  const groups = new Map<string, RadioStation[]>();
  for (const s of stations) {
    const key = `${s.lat},${s.lng}`;
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }
  const out: (RadioStation & { jLat: number; jLng: number })[] = [];
  groups.forEach((group) => {
    const n = group.length;
    group.forEach((s, i) => {
      if (n === 1) {
        out.push({ ...s, jLat: s.lat, jLng: s.lng });
        return;
      }
      const angle = (2 * Math.PI * i) / n;
      const radius = 1.1; // degrees, small enough to stay visually "the same city"
      out.push({ ...s, jLat: s.lat + radius * Math.sin(angle), jLng: s.lng + radius * Math.cos(angle) });
    });
  });
  return out;
}

export default function WorldMapStations({
  stations,
  selectedId,
  onSelect,
  className,
}: {
  stations: RadioStation[];
  selectedId?: string;
  onSelect: (station: RadioStation, event: React.MouseEvent) => void;
  className?: string;
}) {
  const { t } = useLanguage();
  const positioned = useMemo(() => jitter(stations), [stations]);
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
  });

  function zoomBy(factor: number) {
    setPosition((p) => ({ ...p, zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, p.zoom * factor)) }));
  }

  function resetView() {
    setPosition({ coordinates: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
  }

  // Marker geometry is drawn inside the zoomed/panned group, so without
  // compensation every dot would visually balloon in lockstep with the map
  // — divide by zoom to keep a constant on-screen dot size at any zoom level.
  const dotR = 4.5 / position.zoom;
  const selectedR = 6.5 / position.zoom;
  const strokeW = 1.25 / position.zoom;

  return (
    <div className={`relative overflow-hidden bg-card ${className ?? ""}`}>
      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{ scale: 175 }}
        width={980}
        height={560}
        preserveAspectRatio="xMidYMid slice"
        style={{ width: "100%", height: "100%" }}
      >
        <defs>
          <filter id="station-glow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="1.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ZoomableGroup
          center={position.coordinates}
          zoom={position.zoom}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          onMoveEnd={setPosition}
          filterZoomEvent={filterZoomEvent}
        >
          <Sphere id="rsm-sphere" fill="transparent" stroke="rgba(30,27,21,0.15)" strokeWidth={0.75} />
          <Graticule stroke="rgba(30,27,21,0.06)" strokeWidth={0.5} step={[20, 20]} />

          <Geographies geography={worldGeo}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  className="outline-none"
                  style={{
                    default: { fill: "#f1ead6", stroke: "rgba(30,27,21,0.2)", strokeWidth: 0.6 },
                    hover: { fill: "rgba(33,80,74,0.08)", stroke: "rgba(30,27,21,0.3)", strokeWidth: 0.6 },
                    pressed: { fill: "rgba(33,80,74,0.12)", stroke: "rgba(30,27,21,0.3)", strokeWidth: 0.6 },
                  }}
                />
              ))
            }
          </Geographies>

          {positioned.map((station) => {
            const isActive = station.active;
            const isSelected = station.id === selectedId;
            return (
              <Marker key={station.id} coordinates={[station.jLng, station.jLat]}>
                {isActive && (
                  <circle
                    r={dotR}
                    fill="none"
                    stroke="rgba(47,107,58,0.5)"
                    strokeWidth={strokeW}
                    style={{ animation: "map-pulse 2.2s ease-out infinite" }}
                  />
                )}
                <circle
                  r={isSelected ? selectedR : dotR}
                  className="cursor-pointer transition-[r]"
                  fill={isActive ? "#2f6b3a" : "#5b564a"}
                  stroke="#fffdf7"
                  strokeWidth={strokeW}
                  style={isActive ? { filter: "url(#station-glow)" } : undefined}
                  onClick={(e) => onSelect(station, e)}
                >
                  <title>{station.name}</title>
                </circle>
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-3 rounded-md border border-ink/10 bg-card/90 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-wide text-ink/60 shadow-lg backdrop-blur">
        <span className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full bg-verdict-true"
            style={{ boxShadow: "0 0 5px rgba(47,107,58,0.6)" }}
            aria-hidden="true"
          />
          {t("radio.mapLegendMonitored")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-verdict-unverified" aria-hidden="true" />
          {t("radio.mapLegendListenOnly")}
        </span>
      </div>

      <div className="absolute bottom-3 left-3 z-10 flex flex-col overflow-hidden rounded-md border border-ink/10 bg-card/90 shadow-lg backdrop-blur">
        <button
          type="button"
          onClick={() => zoomBy(1.5)}
          aria-label="Zoom in"
          className="flex h-9 w-9 items-center justify-center text-ink/60 transition-colors hover:bg-accent/10 hover:text-accent focus:outline-none focus-visible:bg-accent/10"
        >
          <Plus size={15} aria-hidden="true" />
        </button>
        <div className="h-px bg-ink/10" />
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.5)}
          aria-label="Zoom out"
          className="flex h-9 w-9 items-center justify-center text-ink/60 transition-colors hover:bg-accent/10 hover:text-accent focus:outline-none focus-visible:bg-accent/10"
        >
          <Minus size={15} aria-hidden="true" />
        </button>
        <div className="h-px bg-ink/10" />
        <button
          type="button"
          onClick={resetView}
          aria-label="Reset view"
          className="flex h-9 w-9 items-center justify-center text-ink/60 transition-colors hover:bg-accent/10 hover:text-accent focus:outline-none focus-visible:bg-accent/10"
        >
          <LocateFixed size={14} aria-hidden="true" />
        </button>
      </div>

      <style jsx global>{`
        @keyframes map-pulse {
          from {
            r: ${dotR}px;
            opacity: 0.9;
          }
          to {
            r: ${dotR * 3.2}px;
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          circle {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
