import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: LucideIcon;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon: Icon,
  className,
}: EmptyStateProps) {
  return (
    <Card variant="glass" className={`text-center py-12 ${className}`}>
      <div className="space-y-4">
        {Icon && (
          <Icon className="h-16 w-16 text-light-text-secondary dark:text-dark-text-secondary mx-auto" />
        )}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
            {title}
          </h3>
          <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-md mx-auto">
            {description}
          </p>
        </div>
        {actionLabel && actionHref && (
          <div className="pt-4">
            <Link href={actionHref}>
              <Button variant="glass">{actionLabel}</Button>
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}