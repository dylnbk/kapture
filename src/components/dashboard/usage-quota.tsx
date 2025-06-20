import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Crown, TrendingUp, Download, Zap } from "lucide-react";
import Link from "next/link";

interface UsageQuotaProps {
  plan: "free" | "pro" | "studio";
  usage: {
    scrapes: { current: number; limit: number };
    downloads: { current: number; limit: number };
    aiGenerations: { current: number; limit: number };
  };
}

const planDetails = {
  free: {
    name: "Free",
    color: "bg-gray-500",
    features: ["10 scrapes", "3 downloads", "5 AI generations"],
  },
  pro: {
    name: "Pro",
    color: "bg-blue-500",
    features: ["100 scrapes", "50 downloads", "Unlimited AI"],
  },
  studio: {
    name: "Studio",
    color: "bg-purple-500",
    features: ["500 scrapes", "200 downloads", "Premium features"],
  },
};

export function UsageQuota({ plan, usage }: UsageQuotaProps) {
  const currentPlan = planDetails[plan];
  const isNearLimit = (current: number, limit: number) => current / limit > 0.8;
  const getProgressColor = (current: number, limit: number) => {
    const percentage = (current / limit) * 100;
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <Card className="relative overflow-hidden border">
      <div className={`absolute top-0 left-0 right-0 h-1 ${currentPlan.color}`}></div>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <Crown className="h-5 w-5 text-foreground" />
          <CardTitle className="text-lg">Current Plan</CardTitle>
        </div>
        <Badge variant="secondary" className={`${currentPlan.color} text-white`}>
          {currentPlan.name}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Usage Stats */}
        <div className="space-y-4">
          {/* Scrapes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Trend Scrapes</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {usage.scrapes.current}/{usage.scrapes.limit}
              </span>
            </div>
            <Progress
              value={(usage.scrapes.current / usage.scrapes.limit) * 100}
              className="h-2"
            />
            {isNearLimit(usage.scrapes.current, usage.scrapes.limit) && (
              <p className="text-xs text-red-600 dark:text-red-400">
                You're approaching your limit
              </p>
            )}
          </div>

          {/* Downloads */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Download className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Media Downloads</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {usage.downloads.current}/{usage.downloads.limit}
              </span>
            </div>
            <Progress
              value={(usage.downloads.current / usage.downloads.limit) * 100}
              className="h-2"
            />
          </div>

          {/* AI Generations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">AI Generations</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {usage.aiGenerations.limit === -1
                  ? `${usage.aiGenerations.current}/∞`
                  : `${usage.aiGenerations.current}/${usage.aiGenerations.limit}`}
              </span>
            </div>
            {usage.aiGenerations.limit !== -1 && (
              <Progress
                value={(usage.aiGenerations.current / usage.aiGenerations.limit) * 100}
                className="h-2"
              />
            )}
          </div>
        </div>

        {/* Upgrade CTA */}
        {plan === "free" && (
          <div className="pt-4 border-t border-border">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Unlock unlimited AI generations and more
              </p>
              <Link href="/billing">
                <Button className="w-full">
                  Upgrade to Pro
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Plan Features */}
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-foreground mb-2">
            Plan includes:
          </h4>
          <ul className="space-y-1">
            {currentPlan.features.map((feature, index) => (
              <li key={index} className="text-xs text-muted-foreground flex items-center">
                <div className="w-1 h-1 bg-green-500 rounded-full mr-2"></div>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}