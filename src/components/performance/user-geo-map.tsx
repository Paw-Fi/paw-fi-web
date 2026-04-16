import * as React from "react";

import { DottedMap, Marker } from "@/components/ui/dotted-map";
import { UsersByTimezone } from "@/hooks/use-users-by-timezone";
import {
  getCountryCodeFromTimezone,
  getTimezoneLatLon,
} from "@/lib/timezone-to-country";

interface UserGeoMapProps {
  data: UsersByTimezone[];
}

type UserMarker = Marker & {
  overlay: {
    timezone: string;
    countryCode: string | null;
    userCount: number;
  };
};

export function UserGeoMap({ data }: UserGeoMapProps) {
  const id = React.useId();

  // Build markers with lat/lng for DottedMap
  const markers = React.useMemo(() => {
    return data
      .map((item): UserMarker | null => {
        const coords = getTimezoneLatLon(item.timezone);
        const countryCode = getCountryCodeFromTimezone(item.timezone);
        if (!coords) return null;

        // Calculate marker size based on user count (logarithmic scale)
        const minSize = 1.5;
        const maxSize = 4;
        const logMin = Math.log(1);
        const logMax = Math.log(Math.max(...data.map((d) => d.userCount), 10));
        const logCount = Math.log(item.userCount);
        const normalized = (logCount - logMin) / (logMax - logMin);
        const size = minSize + normalized * (maxSize - minSize);

        return {
          lat: coords.lat,
          lng: coords.lon,
          size,
          pulse: item.userCount > 100,
          overlay: {
            timezone: item.timezone,
            countryCode,
            userCount: item.userCount,
          },
        };
      })
      .filter((m): m is UserMarker => m !== null)
      .sort((a, b) => b.overlay.userCount - a.overlay.userCount);
  }, [data]);

  // Calculate total users for coverage percentage
  const totalUsers = React.useMemo(() => {
    return data.reduce((sum, item) => sum + item.userCount, 0);
  }, [data]);

  const mappedUsers = React.useMemo(() => {
    return markers.reduce((sum, m) => sum + m.overlay.userCount, 0);
  }, [markers]);

  const coveragePercent =
    totalUsers > 0 ? Math.round((mappedUsers / totalUsers) * 100) : 0;

  return (
    <div className="relative w-full">
      <div
        className="relative w-full overflow-hidden rounded-lg border"
        style={{ aspectRatio: "2/1" }}
      >
        <div className="to-background absolute inset-0 bg-radial from-transparent to-200%" />

        <DottedMap<UserMarker>
          width={150}
          height={75}
          markers={markers}
          dotColor="rgba(255, 255, 255, 0.15)"
          markerColor="#10B981"
          dotRadius={0.35}
          stagger
          pulse
          renderMarkerOverlay={({ marker, x, y, r, index }) => {
            const { countryCode, userCount } = marker.overlay;
            const clipId = `${id}-flag-clip-${index}`.replace(/:/g, "-");
            const imgR = r * 0.75;

            const flagUrl = countryCode
              ? `https://flagcdn.com/w80/${countryCode.toLowerCase()}.webp`
              : null;

            const fontSize = r * 0.9;
            const pillH = r * 1.5;
            const countStr = String(userCount);
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
                  stroke="rgba(16, 185, 129, 0.5)"
                  strokeWidth={0.15}
                />
                <text
                  x={pillX + r * 0.7}
                  y={y + fontSize * 0.35}
                  fontSize={fontSize}
                  fill="#34D399"
                  fontWeight="600"
                >
                  {userCount}
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
          timezones with users
        </div>
        <div className="text-white/60">
          Coverage:{" "}
          <span className="font-medium text-emerald-400">{coveragePercent}%</span>
          <span className="ml-2 text-white/40">
            ({mappedUsers.toLocaleString()} / {totalUsers.toLocaleString()} users
            mapped)
          </span>
        </div>
      </div>
    </div>
  );
}
