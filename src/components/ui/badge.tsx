import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { HTMLAttributes } from "react";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-light-accent dark:bg-dark-accent text-light-base dark:text-dark-base",
        secondary:
          "border-transparent bg-light-text-secondary/10 dark:bg-dark-text-secondary/10 text-light-text-primary dark:text-dark-text-primary",
        destructive:
          "border-transparent bg-light-error dark:bg-dark-error text-white",
        outline:
          "border-light-border dark:border-dark-border text-light-text-primary dark:text-dark-text-primary",
        success:
          "border-transparent bg-light-success dark:bg-dark-success text-white",
        glass:
          "border-gray-200/60 dark:border-white/20 bg-white/10 dark:bg-black/10 backdrop-blur-sm text-light-text-primary dark:text-dark-text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };