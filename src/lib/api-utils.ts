import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from './auth';
import { checkRateLimit } from './redis-dev';
import { billingService } from '../services/billing-service';

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    usage?: {
      current: number;
      limit: number;
      remaining: number;
    };
  };
}

export enum APIErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  USAGE_EXCEEDED = 'USAGE_EXCEEDED',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
}

export function createSuccessResponse<T>(data: T, meta?: APIResponse<T>['meta']): NextResponse<APIResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    meta,
  });
}

export function createErrorResponse(
  code: APIErrorCode,
  message: string,
  details?: any,
  status: number = 400
): NextResponse<APIResponse> {
  return NextResponse.json({
    success: false,
    error: {
      code,
      message,
      details,
    },
  }, { status });
}

export function createValidationError(errors: z.ZodError): NextResponse<APIResponse> {
  return createErrorResponse(
    APIErrorCode.VALIDATION_ERROR,
    'Validation failed',
    errors.issues,
    400
  );
}

export function createUnauthorizedError(): NextResponse<APIResponse> {
  return createErrorResponse(
    APIErrorCode.UNAUTHORIZED,
    'Authentication required',
    undefined,
    401
  );
}

export function createForbiddenError(message: string = 'Access denied'): NextResponse<APIResponse> {
  return createErrorResponse(
    APIErrorCode.FORBIDDEN,
    message,
    undefined,
    403
  );
}

export function createNotFoundError(message: string = 'Resource not found'): NextResponse<APIResponse> {
  return createErrorResponse(
    APIErrorCode.NOT_FOUND,
    message,
    undefined,
    404
  );
}

export function createRateLimitError(): NextResponse<APIResponse> {
  return createErrorResponse(
    APIErrorCode.RATE_LIMITED,
    'Rate limit exceeded',
    undefined,
    429
  );
}

export function createUsageExceededError(usageType: string): NextResponse<APIResponse> {
  return createErrorResponse(
    APIErrorCode.USAGE_EXCEEDED,
    `Usage limit exceeded for ${usageType}`,
    undefined,
    403
  );
}

export function createInternalServerError(message: string = 'Internal server error'): NextResponse<APIResponse> {
  return createErrorResponse(
    APIErrorCode.INTERNAL_SERVER_ERROR,
    message,
    undefined,
    500
  );
}

// Middleware functions
export function withAuth(handler: (req: NextRequest, user: any) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const user = await requireAuth();
      return await handler(req, user);
    } catch (error) {
      return createUnauthorizedError();
    }
  };
}

export function withValidation<T>(schema: z.ZodSchema<T>) {
  return (handler: (req: NextRequest, data: T, user?: any) => Promise<NextResponse>) => {
    return async (req: NextRequest, user?: any): Promise<NextResponse> => {
      try {
        const body = await req.json();
        const validatedData = schema.parse(body);
        return await handler(req, validatedData, user);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return createValidationError(error);
        }
        return createInternalServerError('Invalid request data');
      }
    };
  };
}

export function withRateLimit(limit: number = 100, window: number = 60) {
  return (handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>) => {
    return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
      const identifier = req.ip || req.headers.get('x-forwarded-for') || 'anonymous';
      const isAllowed = await checkRateLimit(identifier, limit, window);
      
      if (!isAllowed) {
        return createRateLimitError();
      }
      
      return await handler(req, ...args);
    };
  };
}

export function withUsageValidation(usageType: 'scrape' | 'download' | 'ai_generation') {
  return (handler: (req: NextRequest, user: any) => Promise<NextResponse>) => {
    return async (req: NextRequest, user: any): Promise<NextResponse> => {
      try {
        const hasUsage = await billingService.checkUsageLimit(user.id, usageType);
        
        if (!hasUsage) {
          return createUsageExceededError(usageType);
        }
        
        return await handler(req, user);
      } catch (error) {
        return createInternalServerError('Failed to check usage limits');
      }
    };
  };
}

// Helper function to get client IP
export function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

// Helper function to parse query parameters
export function getQueryParams(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const params: Record<string, string | string[]> = {};
  
  searchParams.forEach((value, key) => {
    if (params[key]) {
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  });
  
  return params;
}

// Helper function to handle paginated responses
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): APIResponse<T[]> {
  const totalPages = Math.ceil(total / limit);
  
  return {
    success: true,
    data,
    meta: {
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    },
  };
}

// Error handling wrapper
export function withErrorHandling(handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>) {
  return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      return await handler(req, ...args);
    } catch (error) {
      console.error('API Error:', error);
      
      if (error instanceof z.ZodError) {
        return createValidationError(error);
      }
      
      if (error instanceof Error) {
        // Check for specific error types
        if (error.message.includes('Unauthorized')) {
          return createUnauthorizedError();
        }
        
        if (error.message.includes('Not found')) {
          return createNotFoundError();
        }
        
        if (error.message.includes('Usage exceeded')) {
          return createUsageExceededError('unknown');
        }
        
        return createInternalServerError(error.message);
      }
      
      return createInternalServerError();
    }
  };
}

// Compose multiple middleware functions
export function compose(...middlewares: Array<(handler: any) => any>) {
  return middlewares.reduce((acc, middleware) => middleware(acc));
}

// Helper to validate UUID parameters
export function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// Helper to validate CUID parameters (used by Prisma @default(cuid()))
export function validateCUID(id: string): boolean {
  // CUID format: c[0-9a-z]{24} (starts with 'c', followed by 24 alphanumeric chars)
  const cuidRegex = /^c[0-9a-z]{24}$/i;
  return cuidRegex.test(id);
}

// Helper to validate ID (handles both UUID and CUID)
export function validateId(id: string): boolean {
  return validateUUID(id) || validateCUID(id);
}

// Helper to extract path parameters
export function getPathParams(req: NextRequest, pattern: string): Record<string, string> {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);
  
  const params: Record<string, string> = {};
  
  for (let i = 0; i < patternParts.length; i++) {
    const part = patternParts[i];
    if (part.startsWith('[') && part.endsWith(']')) {
      const paramName = part.slice(1, -1);
      params[paramName] = pathParts[i] || '';
    }
  }
  
  return params;
}