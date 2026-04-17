import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, Users, MapPin, Calendar, CalendarDays, Infinity, Ban, MessageCircle, AlertCircle, Activity } from "lucide-react";

import { useUserCount } from "@/hooks/use-user-count";
import { useUsersByTimezone } from "@/hooks/use-users-by-timezone";
import { useSubscriptionAnalytics } from "@/hooks/use-subscription-analytics";
import { useTrialingUsers } from "@/hooks/use-trialing-users";
import { useMessageAnalytics } from "@/hooks/use-message-analytics";
import { useDailySignups } from "@/hooks/use-daily-signups";
import { useDAUByTimezone } from "@/hooks/use-dau-by-timezone";
import { useTotalDAU } from "@/hooks/use-total-dau";
import { UserGeoMap } from "@/components/performance/user-geo-map";
import { DAUGeoMap } from "@/components/performance/dau-geo-map";
import { SubscriptionMetricCard } from "@/components/performance/subscription-metric-card";
import { TrialingUsersTable } from "@/components/performance/trialing-users-table";
import { MessageAnalyticsCard } from "@/components/performance/message-analytics-card";
import { DailySignupsCard } from "@/components/performance/daily-signups-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreatorHeader } from "@/components/creator/creator-header";

export const Route = createFileRoute("/creator/performance")({
  component: PerformancePage,
});

function PerformancePage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const totalUsers = useUserCount(refreshKey);
  const usersByTimezone = useUsersByTimezone(refreshKey);
  const subscriptionAnalytics = useSubscriptionAnalytics(refreshKey);
  const trialingUsers = useTrialingUsers(refreshKey);
  const messageAnalytics = useMessageAnalytics(refreshKey);
  const dailySignups = useDailySignups(refreshKey);
  const dauByTimezone = useDAUByTimezone(refreshKey);
  const totalDAU = useTotalDAU(refreshKey);

  return (
    <>
      <div className="min-h-screen bg-slate-950 py-10 text-white">
        <div className="mx-auto w-full max-w-7xl space-y-8 px-4">
          <CreatorHeader />
          <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <p className="text-xs tracking-[0.25em] text-white/60 uppercase">
                Creator Dashboard
              </p>
              <h1 className="text-3xl font-bold text-white">Performance</h1>
            </div>
            <Button
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10 gap-2 bg-transparent"
              onClick={() => setRefreshKey((k) => k + 1)}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </header>


          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Total Users</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <SubscriptionMetricCard
                title="All Registered Users"
                value={totalUsers.currentValue}
                trend={totalUsers.trend}
                changePercent={totalUsers.changePercent}
                color="#10B981"
                icon={<Users className="h-4 w-4" />}
              />
              <SubscriptionMetricCard
                title="Today's DAU"
                value={totalDAU.currentValue}
                trend={[]}
                changePercent={totalDAU.changePercent}
                color="#F59E0B"
                icon={<Activity className="h-4 w-4" />}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Active Subscriptions</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <SubscriptionMetricCard
                title="Monthly Active"
                value={subscriptionAnalytics.monthlyActive.currentValue}
                trend={subscriptionAnalytics.monthlyActive.trend}
                changePercent={subscriptionAnalytics.monthlyActive.changePercent}
                providers={subscriptionAnalytics.monthlyActive.providers}
                color="#3B82F6"
                icon={<Calendar className="h-4 w-4" />}
              />
              <SubscriptionMetricCard
                title="Yearly Active"
                value={subscriptionAnalytics.yearlyActive.currentValue}
                trend={subscriptionAnalytics.yearlyActive.trend}
                changePercent={subscriptionAnalytics.yearlyActive.changePercent}
                providers={subscriptionAnalytics.yearlyActive.providers}
                color="#8B5CF6"
                icon={<CalendarDays className="h-4 w-4" />}
              />
              <SubscriptionMetricCard
                title="Lifetime Active"
                value={subscriptionAnalytics.lifetimeActive.currentValue}
                trend={subscriptionAnalytics.lifetimeActive.trend}
                changePercent={subscriptionAnalytics.lifetimeActive.changePercent}
                providers={subscriptionAnalytics.lifetimeActive.providers}
                color="#F59E0B"
                icon={<Infinity className="h-4 w-4" />}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Other Metrics</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <SubscriptionMetricCard
                title="Cancelled"
                value={subscriptionAnalytics.totalCancelled.currentValue}
                trend={subscriptionAnalytics.totalCancelled.trend}
                changePercent={subscriptionAnalytics.totalCancelled.changePercent}
                providers={subscriptionAnalytics.totalCancelled.providers}
                color="#EF4444"
                icon={<Ban className="h-4 w-4" />}
              />
              <TrialingUsersTable users={trialingUsers} />
              <DailySignupsCard
                dailyData={dailySignups.dailyData}
                todayCount={dailySignups.todayCount}
                averagePerDay={dailySignups.averagePerDay}
                changePercent={dailySignups.changePercent}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Message Analytics</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MessageAnalyticsCard
                title="Today's WhatsApp"
                totalValue={messageAnalytics.todayWhatsApp}
                dailyData={messageAnalytics.dailyData}
                changePercent={messageAnalytics.whatsAppChangePercent}
                channel="whatsapp"
                icon={<MessageCircle className="h-4 w-4" />}
              />
              <MessageAnalyticsCard
                title="Today's Telegram"
                totalValue={messageAnalytics.todayTelegram}
                dailyData={messageAnalytics.dailyData}
                changePercent={messageAnalytics.telegramChangePercent}
                channel="telegram"
                icon={<MessageCircle className="h-4 w-4" />}
              />
            </div>
          </section>

          <section className="space-y-4">
            <Card className="border-white/10 bg-slate-900/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
                    User Distribution
                  </CardDescription>
                  <CardTitle className="mt-1 text-xl text-white">
                    Global User Map
                  </CardTitle>
                </div>
                <MapPin className="h-5 w-5 text-white/50" />
              </CardHeader>
              <CardContent>
                <UserGeoMap data={usersByTimezone} />
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-white/10 bg-slate-900/50">
                <CardHeader className="pb-4">
                  <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
                    Top Regions
                  </CardDescription>
                  <CardTitle className="mt-1 text-xl text-white">
                    Users by Timezone
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[300px] overflow-y-auto">
                  <div className="space-y-2">
                    {usersByTimezone.slice(0, 10).map((item) => (
                      <div
                        key={item.timezone}
                        className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-white/5"
                      >
                        <span className="text-sm text-white/80">
                          {item.timezone.replace(/_/g, " ")}
                        </span>
                        <span className="text-sm font-medium text-emerald-400">
                          {item.userCount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    {usersByTimezone.length === 0 && (
                      <p className="text-sm text-white/50">No timezone data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-slate-900/50">
                <CardHeader className="pb-4">
                  <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
                    Top Active Regions
                  </CardDescription>
                  <CardTitle className="mt-1 text-xl text-white">
                    Today's DAU by Timezone
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[300px] overflow-y-auto">
                  <div className="space-y-2">
                    {dauByTimezone.slice(0, 10).map((item) => (
                      <div
                        key={item.timezone}
                        className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-white/5"
                      >
                        <span className="text-sm text-white/80">
                          {item.timezone.replace(/_/g, " ")}
                        </span>
                        <span className="text-sm font-medium text-blue-400">
                          {item.activeUsers.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    {dauByTimezone.length === 0 && (
                      <p className="text-sm text-white/50">No DAU data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="space-y-4">
            <Card className="border-white/10 bg-slate-900/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
                    Daily Active Users
                  </CardDescription>
                  <CardTitle className="mt-1 text-xl text-white">
                    DAU by Timezone
                  </CardTitle>
                </div>
                <MapPin className="h-5 w-5 text-white/50" />
              </CardHeader>
              <CardContent>
                <DAUGeoMap data={dauByTimezone} />
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </>
  );
}
