import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { 
  createSuccessResponse, 
  createInternalServerError,
  withErrorHandling,
  withAuth,
  withValidation 
} from '@/lib/api-utils';

const createContentIdeaSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  content: z.string().optional(),
  contentType: z.string().min(1, "Content type is required"),
  toneStyle: z.string().default("professional"),
  targetAudience: z.string().optional(),
  referencedContent: z.array(z.string()).optional(),
});

async function handlePOST(req: NextRequest, data: any, user: any) {
  try {
    const { id: ideaboardId } = req.nextUrl.pathname.split('/').reduce((acc, segment, index, array) => {
      if (segment === 'ideaboards' && array[index + 1]) {
        acc.id = array[index + 1];
      }
      return acc;
    }, {} as { id?: string });

    if (!ideaboardId) {
      return createInternalServerError('Ideaboard ID is required');
    }

    // Verify the ideaboard belongs to the user
    const ideaboard = await db.ideaboard.findFirst({
      where: {
        id: ideaboardId,
        userId: user.id,
      },
    });

    if (!ideaboard) {
      return createInternalServerError('Ideaboard not found');
    }

    const { title, description, content, contentType, toneStyle, targetAudience, referencedContent } = data;

    const contentIdea = await db.contentIdea.create({
      data: {
        ideaboardId,
        title,
        description,
        content,
        contentType,
        toneStyle,
        targetAudience,
        referencedContent: referencedContent || [],
        status: content ? 'completed' : 'draft',
      },
    });

    return createSuccessResponse(contentIdea);
  } catch (error) {
    console.error('Create content idea error:', error);
    return createInternalServerError('Failed to create content idea');
  }
}

async function handleGET(req: NextRequest, user: any) {
  try {
    const { id: ideaboardId } = req.nextUrl.pathname.split('/').reduce((acc, segment, index, array) => {
      if (segment === 'ideaboards' && array[index + 1]) {
        acc.id = array[index + 1];
      }
      return acc;
    }, {} as { id?: string });

    if (!ideaboardId) {
      return createInternalServerError('Ideaboard ID is required');
    }

    // Verify the ideaboard belongs to the user
    const ideaboard = await db.ideaboard.findFirst({
      where: {
        id: ideaboardId,
        userId: user.id,
      },
    });

    if (!ideaboard) {
      return createInternalServerError('Ideaboard not found');
    }

    const contentIdeas = await db.contentIdea.findMany({
      where: {
        ideaboardId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return createSuccessResponse(contentIdeas);
  } catch (error) {
    console.error('Get content ideas error:', error);
    return createInternalServerError('Failed to get content ideas');
  }
}

export const GET = withErrorHandling(withAuth(handleGET));
export const POST = withErrorHandling(withAuth(withValidation(createContentIdeaSchema)(handlePOST)));