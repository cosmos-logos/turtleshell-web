export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatAttachment {
  name: string;
  mediaType: string;
  // data URL for image thumbnail (undefined for PDFs — render the filename + icon).
  // Lives only in-session; persisted by the chat store's existing serializer.
  thumbnailDataUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  attachments?: ChatAttachment[];
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
