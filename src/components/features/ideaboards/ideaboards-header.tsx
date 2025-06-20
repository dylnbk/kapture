import { Button } from "@/components/ui/button";
import { Lightbulb, Plus, Sparkles } from "lucide-react";
import Link from "next/link";

export function IdeaboardsHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center space-x-3">
        <Lightbulb className="h-8 w-8 text-light-text-primary dark:text-dark-text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">
            Ideaboards
          </h1>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <Button variant="outline" size="sm">
          <Sparkles className="h-4 w-4 mr-2" />
          AI Templates
        </Button>
        <Link href="/ideaboards/new">
          <Button variant="glass">
            <Plus className="h-4 w-4 mr-2" />
            New Ideaboard
          </Button>
        </Link>
      </div>
    </div>
  );
}