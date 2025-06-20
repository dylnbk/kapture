import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { updateIdeaboardSchema } from '@/lib/validation';
import { validateCUID } from '@/lib/api-utils';
import { 
  createSuccessResponse, 
  createNotFoundError,
  createForbiddenError,
  createInternalServerError,
  withErrorHandling,
  withAuth,
  withValidation 
} from '@/lib/api-utils';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(withAuth(async (req: NextRequest, user: any) => {
    try {
      if (!validateCUID(params.id)) {
        return createNotFoundError('Invalid ideaboard ID');
      }

      const ideaboard = await db.ideaboard.findUnique({
        where: { id: params.id },
        include: {
          aiGenerations: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!ideaboard) {
        return createNotFoundError('Ideaboard not found');
      }

      if (ideaboard.userId !== user.id) {
        return createForbiddenError('Access denied');
      }

      return createSuccessResponse(ideaboard);
    } catch (error) {
      console.error('Get ideaboard error:', error);
      return createInternalServerError('Failed to get ideaboard');
    }
  }))(req);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(withAuth(withValidation(updateIdeaboardSchema)(async (req: NextRequest, data: any, user: any) => {
    try {
      if (!validateCUID(params.id)) {
        return createNotFoundError('Invalid ideaboard ID');
      }

      const existingIdeaboard = await db.ideaboard.findUnique({
        where: { id: params.id },
      });

      if (!existingIdeaboard) {
        return createNotFoundError('Ideaboard not found');
      }

      if (existingIdeaboard.userId !== user.id) {
        return createForbiddenError('Access denied');
      }

      const updatedIdeaboard = await db.ideaboard.update({
        where: { id: params.id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      return createSuccessResponse(updatedIdeaboard);
    } catch (error) {
      console.error('Update ideaboard error:', error);
      return createInternalServerError('Failed to update ideaboard');
    }
  })))(req);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(withAuth(async (req: NextRequest, user: any) => {
    try {
      if (!validateCUID(params.id)) {
        return createNotFoundError('Invalid ideaboard ID');
      }

      const existingIdeaboard = await db.ideaboard.findUnique({
        where: { id: params.id },
      });

      if (!existingIdeaboard) {
        return createNotFoundError('Ideaboard not found');
      }

      if (existingIdeaboard.userId !== user.id) {
        return createForbiddenError('Access denied');
      }

      await db.ideaboard.delete({
        where: { id: params.id },
      });

      return createSuccessResponse({ message: 'Ideaboard deleted successfully' });
    } catch (error) {
      console.error('Delete ideaboard error:', error);
      return createInternalServerError('Failed to delete ideaboard');
    }
  }))(req);
}