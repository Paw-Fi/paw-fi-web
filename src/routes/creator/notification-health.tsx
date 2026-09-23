import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock3,
  Database,
  HardDrive,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  Smartphone,
  XCircle,
} from "lucide-react";

import { CreatorHeader } from "@/components/creator/creator-header";
import { Button } from "@/components/ui/button";
import {
  creatorNotificationHealthQueryKey,
  type NotificationHealth,
  useCreatorNotificationHealth,
} from "@/hooks/use-creator-notification-health";

export const Route = createFileRoute("/creator/notification-health")({
  component: NotificationHealthPage,
});

function NotificationHealthPage() {
  const queryClient = useQueryClient();
  const healthQuery = useCreatorNotificationHealth();
  const health = healthQuery.data;

  return (
    <div className="min-h-screen bg-slate-950 pb-20 font-sans text-slate-100 antialiased selection:bg-slate-800">
      <CreatorHeader />
      <main className="mx-auto w-full max-w-7xl space-y-8 px-4 pt-8 sm:px-6">
        <header className="flex flex-col gap-5 border-b border-slate-800/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
              <span>Creator Console</span>
              <span className="text-slate-600">/</span>
              <span>Delivery Operations</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 p-2.5">
                <BellRing className="h-5 w-5 text-violet-300" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white">
                  Notification Health
                </h1>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
                  Read-only delivery readiness, queue pressure, provider
                  outcomes, and registered-device coverage.
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 self-start border border-slate-800 bg-slate-900/60 text-xs text-slate-300 hover:border-slate-700 hover:bg-slate-900 hover:text-white sm:self-auto"
            disabled={healthQuery.isFetching}
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: creatorNotificationHealthQueryKey,
              })
            }
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${healthQuery.isFetching ? "animate-spin" : ""}`}
            />
            Refresh snapshot
          </Button>
        </header>

        {healthQuery.isLoading ? (
          <LoadingState />
        ) : healthQuery.isError || !health ? (
          <UnavailableState />
        ) : (
          <HealthDashboard
            health={health}
            isRefreshing={healthQuery.isFetching}
          />
        )}
      </main>
    </div>
  );
}

function HealthDashboard({
  health,
  isRefreshing,
}: {
  health: NotificationHealth;
  isRefreshing: boolean;
}) {
  const queueCards = [
    {
      label: "Unsent events",
      value: health.queue.unsent,
      detail: "All events not recorded as sent",
      icon: Clock3,
      tone: health.queue.unsent ? "warning" : "neutral",
    },
    {
      label: "Fallback ready",
      value: health.queue.fallbackReady,
      detail: "Waiting at least 10 minutes",
      icon: ServerCog,
      tone: health.queue.fallbackReady ? "danger" : "neutral",
    },
    {
      label: "Stale claims",
      value: health.queue.staleClaims,
      detail: "Processing for over 15 minutes",
      icon: AlertTriangle,
      tone: health.queue.staleClaims ? "danger" : "neutral",
    },
    {
      label: "Oldest pending",
      value:
        health.queue.oldestPendingAgeMinutes === null
          ? null
          : `${health.queue.oldestPendingAgeMinutes}m`,
      detail: "Age of the oldest unsent event",
      icon: HardDrive,
      tone:
        (health.queue.oldestPendingAgeMinutes ?? 0) >= 15
          ? "warning"
          : "neutral",
    },
  ] as const;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-[1.35fr_1fr_1fr]">
        <OverallStatus health={health} isRefreshing={isRefreshing} />
        <ReadinessCard
          title="Database"
          icon={Database}
          status={health.checks.database.status}
          detail="Operational metrics query"
        />
        <ReadinessCard
          title="Firebase"
          icon={ShieldCheck}
          status={health.checks.firebase.status}
          detail="Credential shape and project alignment"
        />
      </section>

      <section className="space-y-3">
        <SectionHeading
          title="Queue pressure"
          detail="Immediate webhook and five-minute fallback pipeline"
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {queueCards.map((card) => (
            <MetricCard key={card.label} {...card} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <OutcomePanel health={health} />
        <DevicePanel health={health} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <EventTypePanel health={health} />
        <LimitationsPanel limitations={health.limitations} />
      </section>
    </div>
  );
}

function OverallStatus({
  health,
  isRefreshing,
}: {
  health: NotificationHealth;
  isRefreshing: boolean;
}) {
  const statusStyles = {
    healthy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    degraded: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    unhealthy: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  };
  const StatusIcon =
    health.status === "healthy"
      ? CheckCircle2
      : health.status === "degraded"
        ? AlertTriangle
        : XCircle;

  return (
    <div className={`rounded-xl border p-5 ${statusStyles[health.status]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold tracking-wider uppercase opacity-75">
            System assessment
          </div>
          <div className="mt-2 flex items-center gap-2">
            <StatusIcon className="h-5 w-5" />
            <span className="text-2xl font-black capitalize">
              {health.status}
            </span>
          </div>
        </div>
        {isRefreshing ? (
          <span className="rounded border border-current/20 px-2 py-1 text-[10px] font-semibold uppercase opacity-70">
            Refreshing
          </span>
        ) : null}
      </div>
      <p className="mt-5 text-xs opacity-80">
        Snapshot {formatTimestamp(health.generatedAt)}. Queue metrics cover the
        complete backlog; outcomes cover the last{" "}
        {health.scope.recentWindowHours}
        hours.
      </p>
    </div>
  );
}

function ReadinessCard({
  title,
  icon: Icon,
  status,
  detail,
}: {
  title: string;
  icon: typeof Database;
  status: string;
  detail: string;
}) {
  const ready = status === "ready";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-slate-400" />
        <span
          className={`rounded border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
            ready
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {humanize(status)}
        </span>
      </div>
      <h2 className="mt-5 text-lg font-bold text-white">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string | null;
  detail: string;
  icon: typeof Clock3;
  tone: "neutral" | "warning" | "danger";
}) {
  const tones = {
    neutral: "text-slate-200",
    warning: "text-amber-300",
    danger: "text-rose-300",
  };
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-[11px] font-semibold tracking-wider uppercase">
          {label}
        </span>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className={`mt-3 text-3xl font-black tracking-tight ${tones[tone]}`}>
        {value ?? "Unavailable"}
      </div>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function OutcomePanel({ health }: { health: NotificationHealth }) {
  const outcomes = health.outcomes;
  return (
    <Panel>
      <SectionHeading
        title="Recent workflow outcomes"
        detail={`${health.scope.sampledEvents} sampled events, provider acceptance only`}
      />
      {outcomes ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Object.entries(outcomes).map(([label, value]) => (
            <div
              key={label}
              className="rounded border border-slate-800/80 bg-slate-900/40 px-3 py-3"
            >
              <div className="text-2xl font-black text-white">{value}</div>
              <div className="mt-1 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                {humanize(label)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <UnavailableInline />
      )}
    </Panel>
  );
}

function DevicePanel({ health }: { health: NotificationHealth }) {
  const devices = health.devices;
  return (
    <Panel>
      <SectionHeading
        title="Registered devices"
        detail={
          devices
            ? `${devices.active} active of ${devices.total}`
            : "Unavailable"
        }
      />
      {devices ? (
        <div className="mt-5 space-y-3">
          {Object.entries(devices.byPlatform).map(([platform, counts]) => (
            <div
              key={platform}
              className="flex items-center justify-between rounded border border-slate-800/80 bg-slate-900/40 px-3 py-3"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-200 capitalize">
                  {platform}
                </span>
              </div>
              <div className="text-right text-xs">
                <span className="font-bold text-emerald-300">
                  {counts.active} active
                </span>
                <span className="ml-2 text-slate-500">
                  / {counts.total} total
                </span>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-slate-500">
            {devices.inactive} inactive registration
            {devices.inactive === 1 ? "" : "s"}
          </p>
        </div>
      ) : (
        <UnavailableInline />
      )}
    </Panel>
  );
}

function EventTypePanel({ health }: { health: NotificationHealth }) {
  return (
    <Panel>
      <SectionHeading
        title="Observed event types"
        detail="Distribution within the bounded recent sample"
      />
      <div className="mt-5 divide-y divide-slate-800/70 overflow-hidden rounded border border-slate-800">
        {health.eventTypes.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-slate-500">
            No recent notification events observed.
          </p>
        ) : (
          health.eventTypes.map((row) => (
            <div
              key={row.eventType}
              className="flex items-center justify-between bg-slate-900/30 px-4 py-2.5"
            >
              <code className="text-xs text-slate-300">{row.eventType}</code>
              <span className="text-xs font-bold text-violet-300">
                {row.count}
              </span>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

function LimitationsPanel({ limitations }: { limitations: string[] }) {
  return (
    <Panel>
      <SectionHeading
        title="Interpretation guardrails"
        detail="What this snapshot can and cannot prove"
      />
      <div className="mt-5 space-y-3">
        {limitations.map((limitation) => (
          <div
            key={limitation}
            className="flex gap-3 rounded border border-amber-500/20 bg-amber-500/5 px-3 py-3 text-xs leading-relaxed text-amber-100/80"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <span>{limitation}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
      {children}
    </div>
  );
}

function SectionHeading({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-800/80 pb-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-xs font-bold tracking-wider text-slate-200 uppercase">
        {title}
      </h2>
      <span className="text-[11px] text-slate-500">{detail}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Loading notification health"
    >
      {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
        <div
          key={item}
          className="h-32 animate-pulse rounded-lg border border-slate-800 bg-slate-900/40"
        />
      ))}
    </div>
  );
}

function UnavailableState() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">
      <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <h2 className="font-bold">Health snapshot unavailable</h2>
        <p className="mt-1 text-xs text-rose-200/70">
          Access may have expired or the metrics service could not complete its
          read-only checks. Refresh after verifying your creator session.
        </p>
      </div>
    </div>
  );
}

function UnavailableInline() {
  return (
    <p className="mt-5 rounded border border-slate-800 bg-slate-900/40 px-3 py-6 text-center text-xs text-slate-500">
      Metrics unavailable for this snapshot.
    </p>
  );
}

function humanize(value: string) {
  return value.replace(/_/g, " ");
}

function formatTimestamp(value: string) {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime())
    ? "recently"
    : timestamp.toLocaleString();
}
