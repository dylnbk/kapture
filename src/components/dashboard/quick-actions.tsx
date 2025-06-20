import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon, ScanSearch, Download, Lightbulb, ArrowRight } from "lucide-react";
import Link from "next/link";

interface QuickActionProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  buttonText: string;
  color?: "blue" | "green" | "purple" | "orange";
}

function QuickActionCard({ title, description, icon: Icon, href, buttonText, color = "blue" }: QuickActionProps) {
  const colorClasses = {
    blue: "from-blue-500/20 to-blue-600/20 border-blue-500/30",
    green: "from-green-500/20 to-green-600/20 border-green-500/30",
    purple: "from-purple-500/20 to-purple-600/20 border-purple-500/30",
    orange: "from-orange-500/20 to-orange-600/20 border-orange-500/30",
  };

  return (
    <Card className={`bg-gradient-to-br ${colorClasses[color]} hover:scale-105 transition-all duration-200 group border`}>
      <CardHeader className="flex flex-row items-center space-y-0 pb-4">
        <Icon className="h-8 w-8 text-foreground mr-3" />
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {description}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <Link href={href}>
          <Button
            variant="ghost"
            className="w-full justify-between group-hover:bg-white/20 dark:group-hover:bg-black/20"
          >
            {buttonText}
            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function QuickActions() {
  const actions = [
    {
      title: "Scrape the web",
      description: "Find trending content in your niche",
      icon: ScanSearch,
      href: "/trends",
      buttonText: "Start Scraping",
      color: "blue" as const,
    },
    {
      title: "Download Media",
      description: "Save videos, audio, and images",
      icon: Download,
      href: "/downloads",
      buttonText: "Download Now",
      color: "green" as const,
    },
    {
      title: "AI Ideaboard",
      description: "Generate content ideas with AI",
      icon: Lightbulb,
      href: "/ideaboards",
      buttonText: "Create Ideas",
      color: "purple" as const,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {actions.map((action) => (
          <QuickActionCard key={action.title} {...action} />
        ))}
      </div>
    </div>
  );
}