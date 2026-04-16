import * as React from "react";

import { DottedMap, Marker } from "@/components/ui/dotted-map";
import { DAUByTimezone } from "@/hooks/use-dau-by-timezone";
import {
  getCountryCodeFromTimezone,
  getTimezoneLatLon,
} from "@/lib/timezone-to-country";

interface DAUGeoMapProps {
  data: DAUByTimezone[];
}

type DAUMarker = Marker & {
  overlay: {
    timezone: string;
    countryCode: string | null;
    activeUsers: number;
  };
};

export function DAUGeoMap({ data }: DAUGeoMapProps) {
  const id = React.useId();

  // Build markers with lat/lng for DottedMap
  const markers = React.useMemo(() => {
    return data
      .map((item): DAUMarker | null => {
        const coords = getTimezoneLatLon(item.timezone);
        const countryCode = getCountryCodeFromTimezone(item.timezone);
        if (!coords) return null;

        // Calculate marker size based on active users (logarithmic scale)
        const minSize = 1.5;
        const maxSize = 4;
        const logMin = Math.log(1);
        const logMax = Math.log(Math.max(...data.map((d) => d.activeUsers), 10));
        const logCount = Math.log(item.activeUsers);
        const normalized = (logCount - logMin) / (logMax - logMin);
        const size = minSize + normalized * (maxSize - minSize);

        return {
          lat: coords.lat,
          lng: coords.lon,
          size,
          pulse: item.activeUsers > 10,
          overlay: {
            timezone: item.timezone,
            countryCode,
            activeUsers: item.activeUsers,
          },
        };
      })
      .filter((m): m is DAUMarker => m !== null)
      .sort((a, b) => b.overlay.activeUsers - a.overlay.activeUsers);
  }, [data]);

  // Calculate total DAU for coverage percentage
  const totalDAU = React.useMemo(() => {
    return data.reduce((sum, item) => sum + item.activeUsers, 0);
  }, [data]);

  const mappedDAU = React.useMemo(() => {
    return markers.reduce((sum, m) => sum + m.overlay.activeUsers, 0);
  }, [markers]);

  const coveragePercent =
    totalDAU > 0 ? Math.round((mappedDAU / totalDAU) * 100) : 0;

  return (
    <div className="relative w-full">
      <div
        className="relative w-full overflow-hidden rounded-lg border"
        style={{ aspectRatio: "2/1" }}
      >
        <div className="to-background absolute inset-0 bg-radial from-transparent to-200%" />

        <DottedMap<DAUMarker>
          width={150}
          height={75}
          markers={markers}
          dotColor="rgba(255, 255, 255, 0.15)"
          markerColor="#3B82F6"
          dotRadius={0.35}
          stagger
          pulse
          renderMarkerOverlay={({ marker, x, y, r, index }) => {
            const { countryCode, activeUsers } = marker.overlay;
            const clipId = `${id}-flag-clip-${index}`.replace(/:/g, "-");
            const imgR = r * 0.75;

            const flagUrl = countryCode
              ? `https://flagcdn.com/w80/${countryCode.toLowerCase()}.webp`
              : null;

            const fontSize = r * 0.9;
            const pillH = r * 1.5;
            const countStr = String(activeUsers);
            const pillW = countStr.length * (fontSize * 0.62) + r * 1.4;
            const pillX = x + r + r * 0.6;
            const pillY = y - pillH / 2;

            return (
              <g style={{ pointerEvents: "none" }}>
                {flagUrl && (
                  <>
                    <clipPath id={clipId}>
                      <circle cx={x} cy={y} r={imgR} />
                    </clipPath>
                    <image
                      href={flagUrl}
                      x={x - imgR}
                      y={y - imgR}
                      width={imgR * 2}
                      height={imgR * 2}
                      preserveAspectRatio="xMidYMid slice"
                      clipPath={`url(#${clipId})`}
                    />
                  </>
                )}

                <rect
                  x={pillX}
                  y={pillY}
                  width={pillW}
                  height={pillH}
                  rx={pillH / 2}
                  fill="rgba(15, 23, 42, 0.9)"
                  stroke="rgba(59, 130, 246, 0.5)"
                  strokeWidth={0.15}
                />
                <text
                  x={pillX + r * 0.7}
                  y={y + fontSize * 0.35}
                  fontSize={fontSize}
                  fill="#60A5FA"
                  fontWeight="600"
                >
                  {activeUsers}
                </text>
              </g>
            );
          }}
        />
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-sm">
        <div className="text-white/60">
          <span className="font-medium text-white">{markers.length}</span>{" "}
          timezones with active users
        </div>
        <div className="text-white/60">
          Coverage:{" "}
          <span className="font-medium text-blue-400">{coveragePercent}%</span>
          <span className="ml-2 text-white/40">
            ({mappedDAU.toLocaleString()} / {totalDAU.toLocaleString()} DAU
            mapped)
          </span>
        </div>
      </div>
    </div>
  );
}
