export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface ChatRequest {
  prompt: string;
  conversationId?: string;
}

export interface SSEChunk {
  type: 'token' | 'done' | 'error';
  content?: string;
  error?: string;
}
