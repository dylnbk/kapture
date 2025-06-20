import { NextRequest } from 'next/server';
import { db, incrementUserUsage } from '@/lib/db';
import { aiService } from '@/services/ai-service';
import { aiGenerateSchema } from '@/lib/validation';
import { 
  createSuccessResponse, 
  createInternalServerError,
  withErrorHandling,
  withAuth,
  withValidation,
  withUsageValidation 
} from '@/lib/api-utils';

async function handlePOST(req: NextRequest, data: any, user: any) {
  try {
    const { prompt, generationType, model, temperature, maxTokens, ideaboardId } = data;

    // Generate AI content
    const generation = await aiService.generateContent({
      prompt,
      generationType,
      model,
      temperature,
      maxTokens,
      userId: user.id,
      ideaboardId,
    });

    // Save generation to database
    const savedGeneration = await db.aiGeneration.create({
      data: {
        userId: user.id,
        ideaboardId,
        prompt,
        response: generation.content,
        model: generation.model,
        tokensUsed: generation.tokensUsed,
        generationType: generation.generationType,
      },
    });

    // Increment usage counter
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    await incrementUserUsage(user.id, 'ai_generation', periodStart, periodEnd, 1);

    return createSuccessResponse({
      generation: savedGeneration,
      content: generation.content,
      tokensUsed: generation.tokensUsed,
    });
  } catch (error) {
    console.error('AI generation error:', error);
    return createInternalServerError('Failed to generate AI content');
  }
}

export const POST = withErrorHandling(withAuth(withUsageValidation('ai_generation')(withValidation(aiGenerateSchema)(handlePOST))));