import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import {
  createSuccessResponse,
  createInternalServerError,
  createNotFoundError,
  withErrorHandling,
  withAuth,
  withValidation
} from '@/lib/api-utils';

const updateContentSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  contentType: z.string().min(1, "Content type is required").optional(),
  toneStyle: z.string().optional(),
  targetAudience: z.string().optional(),
  referencedContent: z.array(z.string()).optional(),
  status: z.enum(["draft", "ai_suggested", "ai_generated", "completed"]).optional(),
});

async function handleGET(req: NextRequest, user: any) {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const ideaboardId = pathParts[3];
    const contentId = pathParts[5];

    // Verify ideaboard belongs to user
    const ideaboard = await db.ideaboard.findFirst({
      where: {
        id: ideaboardId,
        userId: user.id,
      },
    });

    if (!ideaboard) {
      return createNotFoundError('Ideaboard not found');
    }

    // Get specific content idea
    const contentIdea = await db.contentIdea.findFirst({
      where: {
        id: contentId,
        ideaboardId: ideaboardId,
      },
    });

    if (!contentIdea) {
      return createNotFoundError('Content idea not found');
    }

    return createSuccessResponse(contentIdea);
  } catch (error) {
    console.error('Error fetching content idea:', error);
    return createInternalServerError('Failed to get content idea');
  }
}

async function handlePUT(req: NextRequest, data: any, user: any) {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const ideaboardId = pathParts[3];
    const contentId = pathParts[5];

    // Verify ideaboard belongs to user
    const ideaboard = await db.ideaboard.findFirst({
      where: {
        id: ideaboardId,
        userId: user.id,
      },
    });

    if (!ideaboard) {
      return createNotFoundError('Ideaboard not found');
    }

    // Verify content idea exists and belongs to this ideaboard
    const existingContent = await db.contentIdea.findFirst({
      where: {
        id: contentId,
        ideaboardId: ideaboardId,
      },
    });

    if (!existingContent) {
      return createNotFoundError('Content idea not found');
    }

    // Update content idea
    const contentIdea = await db.contentIdea.update({
      where: {
        id: contentId,
      },
      data: data,
    });

    return createSuccessResponse(contentIdea);
  } catch (error) {
    console.error('Error updating content idea:', error);
    return createInternalServerError('Failed to update content idea');
  }
}

async function handleDELETE(req: NextRequest, user: any) {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const ideaboardId = pathParts[3];
    const contentId = pathParts[5];

    // Verify ideaboard belongs to user
    const ideaboard = await db.ideaboard.findFirst({
      where: {
        id: ideaboardId,
        userId: user.id,
      },
    });

    if (!ideaboard) {
      return createNotFoundError('Ideaboard not found');
    }

    // Verify content idea exists and belongs to this ideaboard
    const existingContent = await db.contentIdea.findFirst({
      where: {
        id: contentId,
        ideaboardId: ideaboardId,
      },
    });

    if (!existingContent) {
      return createNotFoundError('Content idea not found');
    }

    // Delete content idea
    await db.contentIdea.delete({
      where: {
        id: contentId,
      },
    });

    return createSuccessResponse({ success: true });
  } catch (error) {
    console.error('Error deleting content idea:', error);
    return createInternalServerError('Failed to delete content idea');
  }
}

export const GET = withErrorHandling(withAuth(handleGET));
export const PUT = withErrorHandling(withAuth(withValidation(updateContentSchema)(handlePUT)));
export const DELETE = withErrorHandling(withAuth(handleDELETE));