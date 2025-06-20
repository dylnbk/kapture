import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { cancelJobSchema } from '@/lib/validation';
import { 
  createSuccessResponse, 
  createNotFoundError,
  createForbiddenError,
  createInternalServerError,
  withErrorHandling,
  withAuth,
  withValidation
} from '@/lib/api-utils';

async function handlePOST(req: NextRequest, data: { jobId: string }, user: any) {
  try {
    const { jobId } = data;

    // Find the job and verify ownership
    const job = await db.backgroundJob.findUnique({
      where: {
        id: jobId,
      },
    });

    if (!job) {
      return createNotFoundError('Background job not found');
    }

    // Verify user owns this job
    if (job.userId !== user.id) {
      return createForbiddenError('You do not have permission to cancel this job');
    }

    // Check if job can be cancelled
    if (job.status === 'completed') {
      return createForbiddenError('Cannot cancel a completed job');
    }

    if (job.status === 'failed') {
      return createForbiddenError('Cannot cancel a failed job');
    }

    // Update job status to cancelled
    const updatedJob = await db.backgroundJob.update({
      where: {
        id: jobId,
      },
      data: {
        status: 'failed',
        errorMessage: 'Job cancelled by user',
        completedAt: new Date(),
      },
    });

    // TODO: If job is running, send cancellation signal to job processor
    // This would typically involve sending a message to the job queue
    // or setting a flag that the job processor checks periodically

    console.log(`Job ${jobId} cancelled for user ${user.id}`);

    return createSuccessResponse({
      message: 'Job cancelled successfully',
      job: {
        id: updatedJob.id,
        status: updatedJob.status,
        errorMessage: updatedJob.errorMessage,
        completedAt: updatedJob.completedAt,
      },
    });
  } catch (error) {
    console.error('Cancel job error:', error);
    return createInternalServerError('Failed to cancel background job');
  }
}

export const POST = withErrorHandling(
  withAuth(
    withValidation(cancelJobSchema)(handlePOST)
  )
);