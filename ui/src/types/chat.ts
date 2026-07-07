export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatAttachment {
  name: string;
  mediaType: string;
  // data URL for image thumbnail (undefined for PDFs — render the filename + icon).
  // Lives only in-session; persisted by the chat store's existing serializer.
  thumbnailDataUrl?: string;
}

/** EOS-5.4 provenance attached to a completed assistant message — populated
 *  from the terminal `event: provenance` SSE frame. Renders as the gold
 *  Powered-by chip below the bubble. */
export interface ChatMessageProvenance {
  chatProvider: string;
  chatModel: string;
  byokUsed: boolean;
  endpointClass: string;
  tithed: boolean;
  turnCorrelationId: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  attachments?: ChatAttachment[];
  /** Set on assistant messages after the provenance frame arrives. Persisted
   *  through the chat-store so refreshing chat history keeps the chip. */
  provenance?: ChatMessageProvenance;
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
