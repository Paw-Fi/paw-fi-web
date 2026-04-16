import { useMemo } from "react";
// @ts-expect-error - svg-dotted-map is CommonJS without proper types
import { createMap } from "svg-dotted-map";

import { DAUByTimezone } from "@/hooks/use-dau-by-timezone";
import {
  getCountryCodeFromTimezone,
  getFlagUrl,
  getTimezoneCoordinates,
} from "@/lib/timezone-to-country";

interface DAUGeoMapProps {
  data: DAUByTimezone[];
}

interface MapPoint {
  x: number;
  y: number;
}

export function DAUGeoMap({ data }: DAUGeoMapProps) {
  // Generate the base map points
  const mapPoints = useMemo(() => {
    const map = createMap({
      height: 60,
      grid: "diagonal" as const,
    });
    return map.points as MapPoint[];
  }, []);

  // Calculate marker data with coordinates
  const markers = useMemo(() => {
    return data
      .map((item) => {
        const coords = getTimezoneCoordinates(item.timezone);
        const countryCode = getCountryCodeFromTimezone(item.timezone);
        const flagUrl = countryCode ? getFlagUrl(countryCode, 24) : null;

        if (!coords) return null;

        return {
          ...item,
          x: coords.x,
          y: coords.y,
          flagUrl,
          countryCode,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null && m.x !== null && m.y !== null)
      .sort((a, b) => b.activeUsers - a.activeUsers);
  }, [data]);

  // Calculate total DAU for coverage percentage
  const totalDAU = useMemo(() => {
    return data.reduce((sum, item) => sum + item.activeUsers, 0);
  }, [data]);

  const mappedDAU = useMemo(() => {
    return markers.reduce((sum, m) => sum + m.activeUsers, 0);
  }, [markers]);

  const coveragePercent = totalDAU > 0 ? Math.round((mappedDAU / totalDAU) * 100) : 0;

  // Calculate marker size based on user count (logarithmic scale)
  const getMarkerSize = (count: number) => {
    const minSize = 20;
    const maxSize = 50;
    const logMin = Math.log(1);
    const logMax = Math.log(Math.max(...data.map((d) => d.activeUsers), 10));
    const logCount = Math.log(count);
    const normalized = (logCount - logMin) / (logMax - logMin);
    return minSize + normalized * (maxSize - minSize);
  };

  return (
    <div className="relative w-full">
      <div
        className="relative w-full overflow-hidden rounded-lg"
        style={{ aspectRatio: "2/1" }}
      >
        {/* Render dots manually */}
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          {mapPoints.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={0.35}
              fill="rgba(255, 255, 255, 0.15)"
            />
          ))}
        </svg>
      </div>

      {/* Overlay markers */}
      <div className="pointer-events-none absolute inset-0">
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <defs>
            {markers.map(
              (marker, index) =>
                marker.flagUrl && (
                  <pattern
                    key={`flag-${index}`}
                    id={`flag-pattern-dau-${index}`}
                    x="0"
                    y="0"
                    width="1"
                    height="1"
                    patternUnits="objectBoundingBox"
                  >
                    <image href={marker.flagUrl} width="1" height="1" preserveAspectRatio="xMidYMid slice" />
                  </pattern>
                )
            )}
          </defs>

          {markers.map((marker, index) => {
            const size = getMarkerSize(marker.activeUsers);
            const pulseClass = marker.activeUsers > 10 ? "animate-pulse" : "";

            return (
              <g key={marker.timezone} className={pulseClass}>
                {/* Flag circle */}
                <circle
                  cx={marker.x}
                  cy={marker.y}
                  r={size / 2 / 10}
                  fill={`url(#flag-pattern-dau-${index})`}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="0.2"
                />

                {/* Count badge */}
                <g transform={`translate(${marker.x + size / 20}, ${marker.y - size / 20})`}>
                  <rect
                    x="0"
                    y="0"
                    width={Math.max(12, String(marker.activeUsers).length * 3.5) / 10}
                    height="4"
                    rx="2"
                    fill="rgba(15, 23, 42, 0.9)"
                    stroke="rgba(59, 130, 246, 0.5)"
                    strokeWidth="0.2"
                  />
                  <text
                    x={Math.max(12, String(marker.activeUsers).length * 3.5) / 20}
                    y="2.8"
                    textAnchor="middle"
                    fontSize="2.5"
                    fill="#60A5FA"
                    fontWeight="600"
                  >
                    {marker.activeUsers}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-sm">
        <div className="text-white/60">
          <span className="font-medium text-white">{markers.length}</span> timezones with active users
        </div>
        <div className="text-white/60">
          Coverage: <span className="font-medium text-blue-400">{coveragePercent}%</span>
          <span className="ml-2 text-white/40">
            ({mappedDAU.toLocaleString()} / {totalDAU.toLocaleString()} DAU mapped)
          </span>
        </div>
      </div>
    </div>
  );
}
