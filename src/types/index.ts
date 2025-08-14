export interface User {
  _id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: 'admin' | 'user';
  department?: string;
  phone?: string;
  preferences?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Call {
  _id: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'active' | 'completed' | 'scheduled' | 'cancelled';
  participants: Participant[];
  transcript: TranscriptEntry[];
  suggestions: AISuggestion[];
  performance: CallPerformance;
  platform?: 'zoom' | 'meet' | 'teams' | 'other';
  meetingId?: string;
  recording?: {
    url: string;
    duration: number;
    size: number;
    format: string;
  };
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  name: string;
  email?: string;
  role: 'host' | 'participant';
  joinedAt?: Date;
  leftAt?: Date;
}

export interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: Date;
  confidence: number;
  startTime?: number;
  endTime?: number;
  words?: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  sentiment?: 'positive' | 'neutral' | 'negative';
  sentimentScore?: number;
}

export interface AISuggestion {
  id: string;
  type: 'objection_handling' | 'closing' | 'question' | 'pricing' | 'feature_highlight' | 'rapport_building' | 'next_steps' | 'follow_up';
  text: string;
  confidence: number;
  context: string;
  reasoning?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
  used: boolean;
  usedAt?: Date;
  feedback?: {
    rating: number;
    comment: string;
  };
}

export interface Document {
  _id: string;
  name: string;
  type: 'pdf' | 'url' | 'text' | 'doc' | 'docx' | 'image';
  url?: string;
  filePath?: string;
  content?: string;
  extractedText?: string;
  processed: boolean;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  tags: string[];
  fileSize?: number;
  mimeType?: string;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    language?: string;
    author?: string;
    createdDate?: Date;
  };
  aiContext?: {
    keyFeatures: string[];
    benefits: string[];
    pricingInfo: string[];
    useCases: string[];
    competitiveAdvantages: string[];
    objectionResponses: Array<{
      objection: string;
      response: string;
    }>;
    detailedSummary?: string;
    targetAudience?: string[];
    successStories?: string[];
  };
  accessCount: number;
  lastAccessed?: Date;
  createdAt: string;
  updatedAt: string;
}

export interface CallPerformance {
  score?: number;
  talkTimeRatio: number;
  questionsAsked: number;
  objectionsHandled: number;
  suggestionsUsed: number;
  sentimentScore: number;
  keywordsMentioned: string[];
  engagementLevel?: number;
}

export interface Analytics {
  totalCalls: number;
  averageDuration: number;
  successRate: number;
  topPerformers: string[];
  commonObjections: string[];
  suggestionEffectiveness: number;
}