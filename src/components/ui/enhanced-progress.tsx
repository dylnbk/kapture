"use client";

import { cn } from "@/lib/utils";
import { forwardRef, HTMLAttributes } from "react";
import { Clock, Download, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";

export interface DownloadPhase {
  name: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  startTime?: string;
  endTime?: string;
}

export interface EnhancedProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  phases?: DownloadPhase[];
  currentPhase?: string;
  speed?: string;
  eta?: string;
  size?: string;
  showDetails?: boolean;
  error?: string;
}

const Progress = forwardRef<HTMLDivElement, EnhancedProgressProps>(
  ({ 
    className, 
    value = 0, 
    max = 100, 
    status,
    phases = [],
    currentPhase,
    speed,
    eta,
    size,
    showDetails = true,
    error,
    ...props 
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    const getStatusIcon = () => {
      switch (status) {
        case 'pending':
          return <Clock className="h-4 w-4 text-yellow-500" />;
        case 'processing':
          return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
        case 'completed':
          return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'failed':
          return <XCircle className="h-4 w-4 text-red-500" />;
        default:
          return <AlertCircle className="h-4 w-4 text-gray-500" />;
      }
    };

    const getStatusColor = () => {
      switch (status) {
        case 'pending':
          return 'bg-yellow-500';
        case 'processing':
          return 'bg-blue-500';
        case 'completed':
          return 'bg-green-500';
        case 'failed':
          return 'bg-red-500';
        default:
          return 'bg-gray-500';
      }
    };

    const getStatusText = () => {
      switch (status) {
        case 'pending':
          return 'Queued';
        case 'processing':
          return 'Downloading';
        case 'completed':
          return 'Completed';
        case 'failed':
          return 'Failed';
        default:
          return 'Unknown';
      }
    };

    return (
      <div
        ref={ref}
        className={cn("space-y-2", className)}
        {...props}
      >
        {/* Main progress bar */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                {getStatusText()}
              </span>
              {status === 'processing' && (
                <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  {percentage.toFixed(1)}%
                </span>
              )}
            </div>
            {status === 'processing' && eta && (
              <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                ETA: {eta}
              </span>
            )}
          </div>
          
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-light-text-secondary/20 dark:bg-dark-text-secondary/20">
            <div
              className={cn(
                "h-full transition-all duration-300 ease-in-out",
                getStatusColor()
              )}
              style={{
                width: `${percentage}%`,
              }}
            />
            {/* Animated loading bar for processing state */}
            {status === 'processing' && percentage < 100 && (
              <div className="absolute inset-0 overflow-hidden rounded-full">
                <div 
                  className="h-full w-1/4 bg-white/30 animate-pulse"
                  style={{
                    transform: `translateX(${percentage * 3}%)`,
                    animation: 'shimmer 2s infinite'
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Detailed information */}
        {showDetails && (
          <div className="space-y-1">
            {status === 'processing' && (speed || size) && (
              <div className="flex items-center justify-between text-xs text-light-text-secondary dark:text-dark-text-secondary">
                {speed && <span>Speed: {speed}</span>}
                {size && <span>Size: {size}</span>}
              </div>
            )}
            
            {error && status === 'failed' && (
              <div className="text-xs text-red-500 dark:text-red-400">
                {error}
              </div>
            )}

          </div>
        )}

        <style jsx>{`
          @keyframes shimmer {
            0% {
              opacity: 0.5;
            }
            50% {
              opacity: 1;
            }
            100% {
              opacity: 0.5;
            }
          }
        `}</style>
      </div>
    );
  }
);
Progress.displayName = "EnhancedProgress";

export { Progress as EnhancedProgress };