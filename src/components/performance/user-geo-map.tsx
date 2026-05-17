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
import { UsersByTimezone } from "@/hooks/use-users-by-timezone";
import {
  getCountryCodeFromTimezone,
  getTimezoneLatLon,
} from "@/lib/timezone-to-country";

interface UserGeoMapProps {
  data: UsersByTimezone[];
  dailyOnly?: boolean;
}

type UserMarker = Marker & {
  overlay: {
    timezone: string;
    countryCode: string | null;
    userCount: number;
  };
};

export function UserGeoMap({ data, dailyOnly = false }: UserGeoMapProps) {
  const id = React.useId();
  const [selectedCountryCode, setSelectedCountryCode] = React.useState<string | null>(null);

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

  const selectedCountry = React.useMemo(() => {
    if (!selectedCountryCode) {
      return null;
    }

    const matchingMarkers = markers.filter(
      (marker) => marker.overlay.countryCode === selectedCountryCode,
    );

    if (matchingMarkers.length === 0) {
      return null;
    }

    const timezoneBuckets = Array.from(
      new Set(matchingMarkers.map((marker) => marker.overlay.timezone)),
    );

    return {
      countryCode: selectedCountryCode,
      timezoneBuckets,
      totalUsers: matchingMarkers.reduce(
        (sum, marker) => sum + marker.overlay.userCount,
        0,
      ),
    };
  }, [markers, selectedCountryCode]);

  const { users: countryUsers, isLoading: isCountryUsersLoading } = useUsersByTimezones(
    selectedCountry?.timezoneBuckets ?? [],
    dailyOnly,
    Boolean(selectedCountry),
  );

  const countryName = React.useMemo(() => {
    if (!selectedCountry?.countryCode) {
      return null;
    }

    try {
      const formatter = new Intl.DisplayNames(["en"], { type: "region" });
      return formatter.of(selectedCountry.countryCode) ?? selectedCountry.countryCode;
    } catch {
      return selectedCountry.countryCode;
    }
  }, [selectedCountry?.countryCode]);

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
          onMarkerClick={({ marker }) => {
            if (!marker.overlay.countryCode) {
              return;
            }

            setSelectedCountryCode(marker.overlay.countryCode);
          }}
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

      <Dialog
        open={Boolean(selectedCountry)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCountryCode(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl border-white/10 bg-slate-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {countryName ?? "Country"} Users
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {selectedCountry?.totalUsers.toLocaleString() ?? 0} users across {selectedCountry?.timezoneBuckets.length ?? 0}{" "}
              timezone{(selectedCountry?.timezoneBuckets.length ?? 0) === 1 ? "" : "s"}
              {dailyOnly ? " (today only)" : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-white/10 bg-slate-950/70 p-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-white/50">Map Count</p>
              <p className="mt-1 text-base font-semibold text-emerald-400">
                {selectedCountry?.totalUsers.toLocaleString() ?? 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/50">Fetched Users</p>
              <p className="mt-1 text-base font-semibold text-white">
                {countryUsers.length.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/50">Timezone Buckets</p>
              <p className="mt-1 text-base font-semibold text-white">
                {selectedCountry?.timezoneBuckets.length ?? 0}
              </p>
            </div>
          </div>

          <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
            {isCountryUsersLoading ? (
              <div className="rounded-lg border border-white/10 bg-slate-950/60 p-3 text-sm text-white/70">
                Loading users...
              </div>
            ) : countryUsers.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-slate-950/60 p-3 text-sm text-white/70">
                No users found for this country.
              </div>
            ) : (
              countryUsers.map((user) => (
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
