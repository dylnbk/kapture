import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Helper functions for common database operations
export async function getUserByClerkId(clerkUserId: string) {
  return await db.user.findUnique({
    where: {
      clerkUserId,
    },
    include: {
      subscription: true,
    },
  });
}

export async function createUser(data: {
  clerkUserId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}) {
  return await db.user.create({
    data,
  });
}

export async function updateUser(
  clerkUserId: string,
  data: {
    email?: string;
    name?: string;
    avatarUrl?: string;
  }
) {
  return await db.user.update({
    where: {
      clerkUserId,
    },
    data,
  });
}

export async function deleteUser(clerkUserId: string) {
  return await db.user.delete({
    where: {
      clerkUserId,
    },
  });
}

export async function getUserUsage(
  userId: string,
  usageType: string,
  periodStart: Date,
  periodEnd: Date
) {
  return await db.userUsage.findFirst({
    where: {
      userId,
      usageType,
      periodStart,
      periodEnd,
    },
  });
}

export async function incrementUserUsage(
  userId: string,
  usageType: string,
  periodStart: Date,
  periodEnd: Date,
  incrementBy: number = 1
) {
  return await db.userUsage.upsert({
    where: {
      userId_usageType_periodStart: {
        userId,
        usageType,
        periodStart,
      },
    },
    update: {
      count: {
        increment: incrementBy,
      },
    },
    create: {
      userId,
      usageType,
      periodStart,
      periodEnd,
      count: incrementBy,
    },
  });
}

export async function getUserTrends(
  userId: string,
  options?: {
    platform?: string;
    limit?: number;
    offset?: number;
  }
) {
  return await db.trend.findMany({
    where: {
      userId,
      ...(options?.platform && { platform: options.platform }),
    },
    orderBy: {
      scrapedAt: 'desc',
    },
    take: options?.limit,
    skip: options?.offset,
  });
}

export async function getUserDownloads(
  userId: string,
  options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
) {
  return await db.mediaDownload.findMany({
    where: {
      userId,
      keepFile: false, // Exclude archived files from download history
      ...(options?.status && { downloadStatus: options.status }),
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: options?.limit,
    skip: options?.offset,
    include: {
      trend: true,
    },
  });
}

export async function getUserIdeaboards(
  userId: string,
  options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
) {
  return await db.ideaboard.findMany({
    where: {
      userId,
      ...(options?.status && { status: options.status }),
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take: options?.limit,
    skip: options?.offset,
  });
}

// File lifecycle management helpers
export async function getRecentCompletedDownloads(
  userId: string,
  limit: number = 5
) {
  return await db.mediaDownload.findMany({
    where: {
      userId,
      downloadStatus: 'completed',
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      fileSize: true,
    },
  });
}

export async function markDownloadsForCleanup(
  downloadIds: string[],
  cleanupAt: Date
) {
  return await db.$executeRaw`
    UPDATE media_downloads
    SET keep_file = false, file_cleanup_at = ${cleanupAt}
    WHERE id = ANY(${downloadIds})
  `;
}

export async function getDownloadsNeedingCleanup(
  limit: number = 100,
  olderThan?: Date
) {
  const now = new Date();
  const cutoffTime = olderThan || now;
  
  return await db.$queryRaw<Array<{
    id: string;
    userId: string;
    storageKey: string;
    fileSize: number | null;
    originalFileSize: number | null;
    fileCleanupAt: Date | null;
  }>>`
    SELECT id, user_id as "userId", storage_key as "storageKey",
           file_size as "fileSize", original_file_size as "originalFileSize",
           file_cleanup_at as "fileCleanupAt"
    FROM media_downloads
    WHERE keep_file = false
      AND file_cleanup_at <= ${cutoffTime}
      AND storage_key IS NOT NULL
    ORDER BY file_cleanup_at ASC
    LIMIT ${limit}
  `;
}

export async function markDownloadFilesCleaned(downloadIds: string[]) {
  return await db.$executeRaw`
    UPDATE media_downloads
    SET storage_key = NULL, storage_url = NULL, file_size = NULL, file_cleanup_at = NULL
    WHERE id = ANY(${downloadIds})
  `;
}

export async function processUserFileLifecycle(userId: string) {
  // Get all completed downloads for this user, including archived status
  const allCompletedDownloads = await db.mediaDownload.findMany({
    where: {
      userId,
      downloadStatus: 'completed',
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      createdAt: true,
      keepFile: true,
    },
  });

  // Separate manually archived files from regular downloads
  const archivedFiles = allCompletedDownloads.filter(d => d.keepFile === true);
  const regularDownloads = allCompletedDownloads.filter(d => d.keepFile !== true);

  if (regularDownloads.length <= 5) {
    return { markedForCleanup: 0 };
  }

  // Keep the 5 most recent regular downloads, mark others for cleanup
  const recentRegularDownloads = regularDownloads.slice(0, 5);
  const oldRegularDownloads = regularDownloads.slice(5);

  // Ensure the 5 most recent regular downloads are kept (but not permanently archived)
  const keepIds = recentRegularDownloads.map(d => d.id);
  if (keepIds.length > 0) {
    await db.$executeRaw`
      UPDATE media_downloads
      SET keep_file = true, file_cleanup_at = NULL
      WHERE id = ANY(${keepIds})
        AND keep_file != true  -- Don't overwrite manually archived files
    `;
  }

  // Mark older regular downloads for cleanup (schedule for 1 hour from now)
  // Never touch manually archived files
  const cleanupIds = oldRegularDownloads.map(d => d.id);
  if (cleanupIds.length > 0) {
    const cleanupAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    await markDownloadsForCleanup(cleanupIds, cleanupAt);
  }

  return { markedForCleanup: cleanupIds.length };
}

export async function getUserStorageStats(userId: string) {
  const stats = await db.mediaDownload.aggregate({
    where: {
      userId,
      downloadStatus: 'completed',
    },
    _count: {
      id: true,
    },
    _sum: {
      fileSize: true,
    },
  });

  const activeFiles = await db.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM media_downloads
    WHERE user_id = ${userId}
      AND download_status = 'completed'
      AND keep_file = true
      AND storage_key IS NOT NULL
  `;

  return {
    totalDownloads: stats._count?.id || 0,
    activeFiles: Number(activeFiles[0]?.count || 0),
    totalSize: stats._sum?.fileSize || 0,
  };
}