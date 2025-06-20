import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { aiIdeaboardSchema } from '@/lib/validation';
import { 
  createSuccessResponse, 
  createInternalServerError,
  withErrorHandling,
  withAuth,
  withValidation,
  withUsageValidation
} from '@/lib/api-utils';
import { aiService } from '@/services/ai-service';

async function handlePOST(req: NextRequest, data: any, user: any) {
  try {
    const { topic, platform, audience, tone } = data;

    // Generate ideaboard content using AI service
    const generationResponse = await aiService.generateIdeaboard({
      topic,
      platform,
      audience,
      tone,
      userId: user.id,
    });

    // Create ideaboard in database
    const ideaboard = await db.ideaboard.create({
      data: {
        userId: user.id,
        title: generationResponse.title,
        description: `AI-generated content strategy for ${topic} on ${platform}`,
        content: generationResponse.content,
        tags: [platform, topic, tone],
        status: 'draft',
      },
    });

    // Save AI generation record
    const aiGeneration = await db.aiGeneration.create({
      data: {
        userId: user.id,
        ideaboardId: ideaboard.id,
        prompt: `Topic: ${topic}, Platform: ${platform}, Audience: ${audience}, Tone: ${tone}`,
        response: JSON.stringify(generationResponse.content),
        model: 'gpt-4',
        tokensUsed: generationResponse.tokensUsed,
        generationType: 'ideaboard',
      },
    });

    // Update usage tracking
    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      await db.userUsage.upsert({
        where: {
          userId_usageType_periodStart: {
            userId: user.id,
            usageType: 'ai_generation',
            periodStart,
          },
        },
        update: {
          count: {
            increment: 1,
          },
        },
        create: {
          userId: user.id,
          usageType: 'ai_generation',
          count: 1,
          periodStart,
          periodEnd,
        },
      });
    } catch (error) {
      console.error('Failed to update usage:', error);
      // Don't fail the request for usage tracking errors
    }

    const response = {
      ideaboard: {
        id: ideaboard.id,
        title: ideaboard.title,
        description: ideaboard.description,
        content: ideaboard.content,
        tags: ideaboard.tags,
        status: ideaboard.status,
        createdAt: ideaboard.createdAt,
        updatedAt: ideaboard.updatedAt,
      },
      generation: {
        id: aiGeneration.id,
        tokensUsed: aiGeneration.tokensUsed,
        model: aiGeneration.model,
        generationType: aiGeneration.generationType,
        createdAt: aiGeneration.createdAt,
      },
    };

    return createSuccessResponse(response);
  } catch (error) {
    console.error('AI ideaboard generation error:', error);
    
    // Check if it's an OpenAI API error
    if (error instanceof Error && error.message.includes('OpenAI')) {
      return createInternalServerError('AI service temporarily unavailable. Please try again later.');
    }
    
    return createInternalServerError('Failed to generate ideaboard');
  }
}

export const POST = withErrorHandling(
  withAuth(
    withUsageValidation('ai_generation')(
      withValidation(aiIdeaboardSchema)(handlePOST)
    )
  )
);