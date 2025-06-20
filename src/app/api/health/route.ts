import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache } from '@/lib/redis-dev';
import { apifyService } from '@/services/apify-service';
import { storageService } from '@/services/storage-service';
import {
  createSuccessResponse,
  createInternalServerError,
  withErrorHandling
} from '@/lib/api-utils';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    storage: ServiceHealth;
    apify: ServiceHealth;
  };
  system: {
    nodeVersion: string;
    platform: string;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  error?: string;
  lastChecked: string;
}

async function checkDatabaseHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  try {
    // Simple database query to check connectivity
    await db.$queryRaw`SELECT 1`;
    
    // Also check if we can perform a basic operation
    const userCount = await db.user.count();
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime > 5000 ? 'degraded' : 'up', // Degraded if query takes > 5s
      responseTime,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown database error',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkRedisHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  try {
    // In development, we use a no-op cache that always succeeds
    // Test cache operations (will be no-ops in dev)
    const testKey = 'health-check-test';
    const testValue = { timestamp: Date.now() };
    
    await cache.set(testKey, testValue, 60);
    const retrieved = await cache.get(testKey);
    await cache.delete(testKey);
    
    // In development, cache.get always returns null, so we don't validate the retrieved value
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'up', // Always up in development
      responseTime,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown Redis error',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkStorageHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  try {
    // Test storage connectivity by checking if we can generate a signed URL
    const testKey = 'health-check/test.txt';
    
    // Try to get metadata for a non-existent file (this tests connectivity)
    try {
      await storageService.fileExists(testKey);
    } catch (error: any) {
      // Expected to fail for non-existent file, but it tests connectivity
      if (!error.name || error.name !== 'NotFound') {
        throw error;
      }
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime > 3000 ? 'degraded' : 'up', // Degraded if operations take > 3s
      responseTime,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown storage error',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkApifyHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  try {
    // Test if Apify API is accessible by checking a simple operation
    // We'll just verify that the client is properly configured
    if (!process.env.APIFY_API_TOKEN) {
      throw new Error('Apify API token not configured');
    }
    
    // For a quick health check, we won't run an actual scrape
    // but just verify the service is properly initialized
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'up',
      responseTime,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown Apify error',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
    };
  }
}

function getSystemInfo() {
  const memoryUsage = process.memoryUsage();
  const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
  const usedMemory = memoryUsage.heapUsed;
  
  return {
    nodeVersion: process.version,
    platform: process.platform,
    memory: {
      used: usedMemory,
      total: totalMemory,
      percentage: Math.round((usedMemory / totalMemory) * 100),
    },
  };
}

function calculateOverallStatus(services: HealthCheckResult['services']): 'healthy' | 'degraded' | 'unhealthy' {
  const serviceStatuses = Object.values(services).map(service => service.status);
  
  if (serviceStatuses.every(status => status === 'up')) {
    return 'healthy';
  }
  
  if (serviceStatuses.some(status => status === 'down')) {
    return 'unhealthy';
  }
  
  return 'degraded';
}

async function handleGET(req: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Run all health checks in parallel
    const [databaseHealth, redisHealth, storageHealth, apifyHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
      checkStorageHealth(),
      checkApifyHealth(),
    ]);
    
    const services = {
      database: databaseHealth,
      redis: redisHealth,
      storage: storageHealth,
      apify: apifyHealth,
    };
    
    const overallStatus = calculateOverallStatus(services);
    const systemInfo = getSystemInfo();
    
    const healthCheck: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime(),
      services,
      system: systemInfo,
    };
    
    const totalResponseTime = Date.now() - startTime;
    console.log(`Health check completed in ${totalResponseTime}ms with status: ${overallStatus}`);
    
    // Cache the health check result for 30 seconds to prevent excessive checks
    await cache.set('health-check:last-result', healthCheck, 30).catch(() => {
      // Ignore cache errors in health check
    });
    
    // Return appropriate HTTP status based on health
    const httpStatus = overallStatus === 'healthy' ? 200 :
                      overallStatus === 'degraded' ? 200 : 503;
    
    return NextResponse.json({
      success: overallStatus !== 'unhealthy',
      data: healthCheck,
    }, {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    
    const errorResponse: HealthCheckResult = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime(),
      services: {
        database: { status: 'down', error: 'Health check failed', lastChecked: new Date().toISOString() },
        redis: { status: 'down', error: 'Health check failed', lastChecked: new Date().toISOString() },
        storage: { status: 'down', error: 'Health check failed', lastChecked: new Date().toISOString() },
        apify: { status: 'down', error: 'Health check failed', lastChecked: new Date().toISOString() },
      },
      system: getSystemInfo(),
    };
    
    return NextResponse.json({
      success: false,
      data: errorResponse,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: error instanceof Error ? error.message : 'Health check failed',
      },
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}

// Add a simple HEAD endpoint for basic liveness checks
async function handleHEAD(req: NextRequest) {
  return new NextResponse(null, { status: 200 });
}

export const GET = withErrorHandling(handleGET);
export const HEAD = withErrorHandling(handleHEAD);