"use client";

import { DownloadProgress } from '@/types/downloads';

const PROGRESS_STORAGE_KEY = 'kapture_download_progress';
const STORAGE_EXPIRY_HOURS = 24; // Progress data expires after 24 hours

interface StoredProgress {
  [downloadId: string]: {
    progress: DownloadProgress;
    timestamp: number;
    expiresAt: number;
  };
}

class ProgressStorageService {
  private getStoredData(): StoredProgress {
    if (typeof window === 'undefined') return {};
    
    try {
      const stored = localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (!stored) return {};
      
      const data = JSON.parse(stored) as StoredProgress;
      const now = Date.now();
      
      // Clean up expired entries
      const cleaned: StoredProgress = {};
      for (const [id, entry] of Object.entries(data)) {
        if (entry.expiresAt > now) {
          cleaned[id] = entry;
        }
      }
      
      // Save cleaned data back if we removed expired entries
      if (Object.keys(cleaned).length !== Object.keys(data).length) {
        this.saveStoredData(cleaned);
      }
      
      return cleaned;
    } catch (error) {
      console.warn('Failed to parse progress storage data:', error);
      return {};
    }
  }

  private saveStoredData(data: StoredProgress): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save progress storage data:', error);
    }
  }

  saveProgress(downloadId: string, progress: DownloadProgress): void {
    const stored = this.getStoredData();
    const now = Date.now();
    const expiresAt = now + (STORAGE_EXPIRY_HOURS * 60 * 60 * 1000);
    
    stored[downloadId] = {
      progress,
      timestamp: now,
      expiresAt
    };
    
    this.saveStoredData(stored);
  }

  getProgress(downloadId: string): DownloadProgress | null {
    const stored = this.getStoredData();
    const entry = stored[downloadId];
    
    if (!entry) return null;
    
    return entry.progress;
  }

  removeProgress(downloadId: string): void {
    const stored = this.getStoredData();
    delete stored[downloadId];
    this.saveStoredData(stored);
  }

  getAllProgress(): { [downloadId: string]: DownloadProgress } {
    const stored = this.getStoredData();
    const result: { [downloadId: string]: DownloadProgress } = {};
    
    for (const [id, entry] of Object.entries(stored)) {
      result[id] = entry.progress;
    }
    
    return result;
  }

  clearExpiredProgress(): void {
    // This is automatically handled in getStoredData()
    this.getStoredData();
  }

  clearAllProgress(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
  }

  // Get progress with fallback phases for consistent UI
  getProgressWithFallback(downloadId: string, status: string): DownloadProgress {
    const stored = this.getProgress(downloadId);
    
    if (stored) {
      return stored;
    }
    
    // Return default progress structure based on status
    const defaultPhases: Array<{
      name: string;
      status: 'pending' | 'active' | 'completed' | 'failed';
    }> = [
      { name: 'Queue', status: status === 'pending' ? 'active' : 'completed' },
      { name: 'Extract Info', status: 'pending' },
      { name: 'Download', status: 'pending' },
      { name: 'Process', status: 'pending' },
      { name: 'Complete', status: 'pending' }
    ];

    if (status === 'completed') {
      defaultPhases.forEach(phase => phase.status = 'completed');
    } else if (status === 'failed') {
      defaultPhases[0].status = 'completed';
      defaultPhases[1].status = 'failed';
    }

    return {
      percentage: status === 'completed' ? 100 : 0,
      currentPhase: status === 'pending' ? 'Queued' : 
                   status === 'completed' ? 'Completed' :
                   status === 'failed' ? 'Failed' : 'Processing',
      phases: defaultPhases
    };
  }

  // Update progress with automatic persistence
  updateProgress(
    downloadId: string, 
    updates: Partial<DownloadProgress>
  ): DownloadProgress {
    const current = this.getProgress(downloadId) || {
      percentage: 0,
      phases: [
        { name: 'Queue', status: 'completed' },
        { name: 'Extract Info', status: 'pending' },
        { name: 'Download', status: 'pending' },
        { name: 'Process', status: 'pending' },
        { name: 'Complete', status: 'pending' }
      ]
    };

    const updated = { ...current, ...updates };
    this.saveProgress(downloadId, updated);
    return updated;
  }
}

export const progressStorageService = new ProgressStorageService();