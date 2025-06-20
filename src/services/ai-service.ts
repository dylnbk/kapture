import OpenAI from 'openai';
import { CircuitBreaker } from '../lib/redis-dev';
import { cache, CACHE_KEYS, CACHE_TTL } from '../lib/redis-dev';

export interface AIGenerationRequest {
  prompt: string;
  generationType: 'title' | 'hook' | 'script' | 'description' | 'hashtags';
  model?: 'gpt-4' | 'gpt-3.5-turbo';
  temperature?: number;
  maxTokens?: number;
  userId: string;
  ideaboardId?: string;
}

export interface AIGenerationResponse {
  content: string;
  tokensUsed: number;
  model: string;
  generationType: string;
}

export interface IdeaboardGenerationRequest {
  topic: string;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'twitter';
  audience: string;
  tone: 'professional' | 'casual' | 'humorous' | 'educational' | 'inspirational';
  userId: string;
}

export interface IdeaboardGenerationResponse {
  title: string;
  content: {
    overview: string;
    keyPoints: string[];
    contentIdeas: Array<{
      title: string;
      description: string;
      hooks: string[];
      hashtags: string[];
    }>;
    targetAudience: string;
    contentStrategy: string;
  };
  tokensUsed: number;
}

class AIService {
  private openai: OpenAI;
  private circuitBreaker: InstanceType<typeof CircuitBreaker>;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.circuitBreaker = new CircuitBreaker(5, 60000);
  }

  private async executeWithCircuitBreaker<T>(operation: () => Promise<T>): Promise<T> {
    return this.circuitBreaker.execute(operation);
  }

  private getPromptTemplate(generationType: string, context: any = {}): string {
    const templates = {
      title: `Generate 5 compelling titles for ${context.platform || 'social media'} content about: ${context.topic || context.prompt}
      
Make them:
- Attention-grabbing and clickable
- Optimized for ${context.platform || 'social media'}
- Relevant to the target audience: ${context.audience || 'general audience'}
- In a ${context.tone || 'engaging'} tone

Format as a numbered list.`,

      hook: `Create 5 powerful opening hooks for ${context.platform || 'social media'} content about: ${context.topic || context.prompt}

The hooks should:
- Grab attention in the first 3 seconds
- Be suitable for ${context.platform || 'social media'}
- Match a ${context.tone || 'engaging'} tone
- Appeal to: ${context.audience || 'general audience'}

Format as a numbered list.`,

      script: `Write a complete ${context.platform || 'social media'} script for: ${context.topic || context.prompt}

Requirements:
- Duration: 30-60 seconds
- Platform: ${context.platform || 'social media'}
- Tone: ${context.tone || 'engaging'}
- Target audience: ${context.audience || 'general audience'}
- Include clear call-to-action
- Structure with timestamps

Format with clear sections and timing cues.`,

      description: `Write an optimized description for ${context.platform || 'social media'} content about: ${context.topic || context.prompt}

Include:
- Compelling opening line
- Key points and value proposition
- Relevant keywords for discoverability
- Clear call-to-action
- Platform-specific optimization for ${context.platform || 'social media'}
- Tone: ${context.tone || 'engaging'}

Target audience: ${context.audience || 'general audience'}`,

      hashtags: `Generate 20 relevant hashtags for ${context.platform || 'social media'} content about: ${context.topic || context.prompt}

Mix of:
- 5 highly popular hashtags (1M+ posts)
- 10 moderately popular hashtags (100K-1M posts)
- 5 niche hashtags (10K-100K posts)

Platform: ${context.platform || 'social media'}
Target audience: ${context.audience || 'general audience'}

Format as a space-separated list.`,
    };

    return templates[generationType as keyof typeof templates] || context.prompt;
  }

  async generateContent(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    return this.executeWithCircuitBreaker(async () => {
      // Check cache first
      const cacheKey = CACHE_KEYS.AI_GENERATION(request.prompt + request.generationType);
      const cached = await cache.get<AIGenerationResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      const prompt = this.getPromptTemplate(request.generationType, {
        prompt: request.prompt,
        platform: 'social media', // Default, can be enhanced later
        audience: 'general audience',
        tone: 'engaging',
      });

      const completion = await this.openai.chat.completions.create({
        model: request.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional social media content creator and strategist. Create engaging, platform-optimized content that drives engagement and conversions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 1000,
      });

      const response: AIGenerationResponse = {
        content: completion.choices[0]?.message?.content || '',
        tokensUsed: completion.usage?.total_tokens || 0,
        model: request.model || 'gpt-4',
        generationType: request.generationType,
      };

      // Cache the response
      await cache.set(cacheKey, response, CACHE_TTL.AI_GENERATION);

      return response;
    });
  }

  async generateIdeaboard(request: IdeaboardGenerationRequest): Promise<IdeaboardGenerationResponse> {
    return this.executeWithCircuitBreaker(async () => {
      const prompt = `Create a comprehensive content ideaboard for ${request.platform} about: ${request.topic}

Target Audience: ${request.audience}
Tone: ${request.tone}

Generate a detailed ideaboard including:

1. OVERVIEW
   - Brief description of the content theme
   - Why this topic matters to the target audience

2. KEY POINTS (5 main points to cover)
   - Core messages and value propositions

3. CONTENT IDEAS (5 specific content pieces)
   For each idea provide:
   - Compelling title
   - Detailed description
   - 3 attention-grabbing hooks
   - 10 relevant hashtags

4. TARGET AUDIENCE ANALYSIS
   - Detailed audience persona
   - Pain points and interests
   - Content consumption preferences

5. CONTENT STRATEGY
   - Posting schedule recommendations
   - Engagement tactics
   - Growth strategy

Format the response as a structured JSON object that can be easily parsed and displayed.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert social media strategist and content creator. Generate comprehensive, actionable content strategies that are platform-specific and audience-focused. Always respond with structured, detailed plans that creators can immediately implement.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      });

      const content = completion.choices[0]?.message?.content || '';
      
      // Parse the AI response into structured content
      const structuredContent = this.parseIdeaboardContent(content, request);

      return {
        title: `${request.topic} Content Strategy for ${request.platform}`,
        content: structuredContent,
        tokensUsed: completion.usage?.total_tokens || 0,
      };
    });
  }

  private parseIdeaboardContent(aiResponse: string, request: IdeaboardGenerationRequest): any {
    // This is a simplified parser - in production, you might want more sophisticated parsing
    try {
      // Try to parse as JSON first
      return JSON.parse(aiResponse);
    } catch {
      // If not JSON, create structured content from the text response
      return {
        overview: this.extractSection(aiResponse, 'OVERVIEW', 'KEY POINTS') || `Content strategy for ${request.topic} on ${request.platform}`,
        keyPoints: this.extractListItems(aiResponse, 'KEY POINTS', 'CONTENT IDEAS'),
        contentIdeas: this.extractContentIdeas(aiResponse),
        targetAudience: this.extractSection(aiResponse, 'TARGET AUDIENCE', 'CONTENT STRATEGY') || `${request.audience} interested in ${request.topic}`,
        contentStrategy: this.extractSection(aiResponse, 'CONTENT STRATEGY') || 'Consistent posting schedule with engagement-focused content',
      };
    }
  }

  private extractSection(text: string, startMarker: string, endMarker?: string): string {
    const startIndex = text.indexOf(startMarker);
    if (startIndex === -1) return '';

    const contentStart = startIndex + startMarker.length;
    const endIndex = endMarker ? text.indexOf(endMarker, contentStart) : text.length;
    
    return text.substring(contentStart, endIndex > -1 ? endIndex : text.length).trim();
  }

  private extractListItems(text: string, startMarker: string, endMarker?: string): string[] {
    const section = this.extractSection(text, startMarker, endMarker);
    return section
      .split('\n')
      .filter(line => line.trim().match(/^\d+\.|^-|^\*/))
      .map(line => line.replace(/^\d+\.|^-|^\*/, '').trim())
      .filter(item => item.length > 0);
  }

  private extractContentIdeas(text: string): Array<{
    title: string;
    description: string;
    hooks: string[];
    hashtags: string[];
  }> {
    // Simplified extraction - in production, you'd want more sophisticated parsing
    const ideas = [];
    const contentSection = this.extractSection(text, 'CONTENT IDEAS');
    
    // This is a basic implementation - you'd enhance this based on your AI response format
    const ideaBlocks = contentSection.split(/\d+\./).filter(block => block.trim());
    
    for (const block of ideaBlocks.slice(0, 5)) {
      ideas.push({
        title: this.extractFirstLine(block),
        description: this.extractDescription(block),
        hooks: this.extractHooks(block),
        hashtags: this.extractHashtags(block),
      });
    }

    return ideas;
  }

  private extractFirstLine(text: string): string {
    return text.split('\n')[0]?.trim() || 'Content Idea';
  }

  private extractDescription(text: string): string {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.slice(1, 3).join(' ').trim() || 'Engaging content description';
  }

  private extractHooks(text: string): string[] {
    const hooks = text.match(/hook[s]?:?\s*([^\n]+)/gi);
    return hooks ? hooks.slice(0, 3).map(h => h.replace(/hook[s]?:?\s*/gi, '').trim()) : ['Attention-grabbing opening', 'Compelling question', 'Surprising fact'];
  }

  private extractHashtags(text: string): string[] {
    const hashtagMatches = text.match(/#[\w]+/g);
    return hashtagMatches ? hashtagMatches.slice(0, 10) : ['#content', '#viral', '#trending', '#socialmedia', '#creator'];
  }

  async generateBulkContent(requests: AIGenerationRequest[]): Promise<AIGenerationResponse[]> {
    // Process in batches to avoid rate limits
    const batchSize = 3;
    const results: AIGenerationResponse[] = [];

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request => this.generateContent(request));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add small delay between batches to respect rate limits
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  async streamGeneration(request: AIGenerationRequest): Promise<AsyncIterable<string>> {
    const prompt = this.getPromptTemplate(request.generationType, {
      prompt: request.prompt,
    });

    const stream = await this.openai.chat.completions.create({
      model: request.model || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a professional social media content creator and strategist.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 1000,
      stream: true,
    });

    return this.processStream(stream);
  }

  private async* processStream(stream: any): AsyncIterable<string> {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}

export const aiService = new AIService();