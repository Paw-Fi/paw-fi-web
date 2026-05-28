import * as React from "react";

import { DottedMap, Marker } from "@/components/ui/dotted-map";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUsersByTimezones } from "@/hooks/use-users-by-timezones";
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
  const [selectedTimezone, setSelectedTimezone] = React.useState<string | null>(null);

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

  const selectedMarker = React.useMemo(() => {
    if (!selectedTimezone) return null;
    return markers.find((m) => m.overlay.timezone === selectedTimezone) ?? null;
  }, [markers, selectedTimezone]);

  const { users: timezoneUsers, isLoading: isTimezoneUsersLoading } = useUsersByTimezones(
    selectedTimezone ? [selectedTimezone] : [],
    false,
    Boolean(selectedTimezone),
  );

  const countryName = React.useMemo(() => {
    if (!selectedMarker?.overlay.countryCode) return null;
    try {
      const formatter = new Intl.DisplayNames(["en"], { type: "region" });
      return formatter.of(selectedMarker.overlay.countryCode) ?? selectedMarker.overlay.countryCode;
    } catch {
      return selectedMarker.overlay.countryCode;
    }
  }, [selectedMarker?.overlay.countryCode]);

  return (
    <div className="relative w-full">
      <div
        className="relative w-full overflow-hidden rounded-lg border"
        style={{ aspectRatio: "2/1" }}
      >
        <div className="to-background pointer-events-none absolute inset-0 bg-radial from-transparent to-200%" />

        <DottedMap<DAUMarker>
          width={150}
          height={75}
          markers={markers}
          dotColor="rgba(255, 255, 255, 0.15)"
          markerColor="#3B82F6"
          dotRadius={0.35}
          stagger
          pulse
          onMarkerClick={({ marker }) => {
            setSelectedTimezone(marker.overlay.timezone);
          }}
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

      <Dialog
        open={Boolean(selectedMarker)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTimezone(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl border-white/10 bg-slate-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedMarker?.overlay.timezone.replace(/_/g, " ") ?? "Timezone"}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {countryName ? `${countryName} • ` : ""}
              {selectedMarker?.overlay.activeUsers.toLocaleString() ?? 0} active users today
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-white/10 bg-slate-950/70 p-3 text-sm">
            <div>
              <p className="text-xs text-white/50">Active Users</p>
              <p className="mt-1 text-base font-semibold text-blue-400">
                {selectedMarker?.overlay.activeUsers.toLocaleString() ?? 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/50">Users in Timezone</p>
              <p className="mt-1 text-base font-semibold text-white">
                {timezoneUsers.length.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
            {isTimezoneUsersLoading ? (
              <div className="rounded-lg border border-white/10 bg-slate-950/60 p-3 text-sm text-white/70">
                Loading users...
              </div>
            ) : timezoneUsers.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-slate-950/60 p-3 text-sm text-white/70">
                No users found for this timezone.
              </div>
            ) : (
              timezoneUsers.map((user) => (
                <div
                  key={user.userId}
                  className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2"
                >
                  <p className="text-sm font-medium text-white">
                    {user.fullName || user.email || user.userId}
                  </p>
                  <p className="text-xs text-white/60">{user.email || "No email"}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/50">
                    <span>{user.preferredTimezone}</span>
                    <span>•</span>
                    <span>{new Date(user.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
