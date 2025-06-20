export interface Ideaboard {
  id: string;
  name: string;
  description?: string;
  keywords: string[];
  creativity: number;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface ContentIdea {
  id: string;
  ideaboardId: string;
  title: string;
  description?: string;
  contentType: string;
  toneStyle: string;
  targetAudience?: string;
  status: 'draft' | 'ai_suggested' | 'ai_generated' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface AIGeneration {
  id: string;
  ideaboardId: string;
  prompt: string;
  response: string;
  model: string;
  tokensUsed?: number;
  generationType: 'title' | 'hook' | 'script' | 'description' | 'hashtags' | 'idea';
  createdAt: string;
}