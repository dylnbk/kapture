import { cn } from "@/lib/utils";
import { forwardRef, HTMLAttributes } from "react";

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    return (
      <div
        ref={ref}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-light-text-secondary/20 dark:bg-dark-text-secondary/20",
          className
        )}
        {...props}
      >
        <div
          className="h-full w-full flex-1 bg-light-success dark:bg-dark-success transition-all duration-300 ease-in-out"
          style={{
            transform: `translateX(-${100 - percentage}%)`,
          }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };