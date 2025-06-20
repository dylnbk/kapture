"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (except 408, 429)
        if (error?.status >= 400 && error?.status < 500 && ![408, 429].includes(error?.status)) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
});

// Add global error handling for downloads
queryClient.setMutationDefaults(['download-request'], {
  retry: 1,
  retryDelay: 1000,
});

queryClient.setQueryDefaults(['downloads'], {
  staleTime: 1000 * 60 * 2, // 2 minutes for downloads list
  refetchInterval: false, // Don't auto-refetch, rely on manual triggers
});

queryClient.setQueryDefaults(['downloads-queue'], {
  staleTime: 0, // Always consider queue data stale
  refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  refetchIntervalInBackground: true, // Continue polling in background
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}