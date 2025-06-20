import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StatsCard } from "@/components/dashboard/stats-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { UsageQuota } from "@/components/dashboard/usage-quota";
import { TrendingUp, Download, Zap, Lightbulb } from "lucide-react";

export default async function DashboardPage() {
  // User is already synced by layout, just get current user
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  // Mock data - in real app, this would come from API
  const stats = {
    trendsScraped: 0,
    mediaDownloads: 0,
    aiGenerations: 0,
    ideaboards: 0,
  };

  const usage = {
    scrapes: { current: 0, limit: 10 },
    downloads: { current: 0, limit: 3 },
    aiGenerations: { current: 0, limit: 5 },
  };

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">
          Welcome back, {user.name || "Creator"}!
        </h1>
        <p className="text-light-text-secondary dark:text-dark-text-secondary">
          Your content creation dashboard
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Trends Scraped"
          value={stats.trendsScraped}
          subtitle="This month"
          icon={TrendingUp}
          trend={{ value: 0, isPositive: true }}
        />
        <StatsCard
          title="Media Downloads"
          value={stats.mediaDownloads}
          subtitle="This month"
          icon={Download}
          trend={{ value: 0, isPositive: true }}
        />
        <StatsCard
          title="AI Generations"
          value={stats.aiGenerations}
          subtitle="This month"
          icon={Zap}
          trend={{ value: 0, isPositive: true }}
        />
        <StatsCard
          title="Ideaboards"
          value={stats.ideaboards}
          subtitle="Created"
          icon={Lightbulb}
        />
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>

        {/* Usage Quota - Takes 1 column */}
        <div className="lg:col-span-1">
          <UsageQuota plan="free" usage={usage} />
        </div>
      </div>
    </div>
  );
}