import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Square, Trash2 } from 'lucide-react';
import { useChatStore } from '@/lib/store/chat-store';
import { streamChat } from '@/lib/athena/chat-client';
import { generateId, formatTimestamp } from '@/lib/utils/helpers';
import type { ChatMessage } from '@/types/chat';

export function Chat() {
  const [input, setInput] = useState('');
  const { messages, isStreaming, error, addMessage, updateLastAssistantMessage, setStreaming, setError, clearMessages } =
    useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || isStreaming) return;

    setInput('');
    setError(null);

    // Add user message
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };
    addMessage(userMsg);

    // Add empty assistant message for streaming
    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    addMessage(assistantMsg);
    setStreaming(true);

    // Stream response
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let accumulated = '';
      for await (const token of streamChat(prompt, controller.signal)) {
        accumulated += token;
        updateLastAssistantMessage(accumulated);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        const message = (err as Error).message;
        console.error('🐢 [Athena] Stream error:', err);

        let userMessage: string;
        if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
          userMessage = 'Cannot reach Athena. Check that the endpoint is running and CORS is configured.';
        } else if (message.includes('403')) {
          userMessage = 'Access denied by Athena. Check authentication configuration.';
        } else if (message.includes('404')) {
          userMessage = 'Chat endpoint not found. Check the environment URL in Settings.';
        } else {
          userMessage = message;
        }

        setError(userMessage);
        updateLastAssistantMessage(`⚠️ ${userMessage}`);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, isStreaming, addMessage, updateLastAssistantMessage, setStreaming, setError]);

  const stopStreaming = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Messages area */}
      <div ref={scrollRef} className="chat-container space-y-4">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="text-5xl">🐢</div>
              <h2 className="text-xl font-semibold text-text-primary">
                Welcome to TurtleShell.ai
              </h2>
              <p className="text-sm text-text-muted max-w-md">
                Start a conversation with Athena. Connect enterprise services
                from the Services tab to enable MCP-powered workflows.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`message-bubble ${
                msg.role === 'user'
                  ? 'message-bubble-user'
                  : 'message-bubble-assistant'
              }`}
            >
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
                {msg.isStreaming && isStreaming && (
                  <span className="streaming-cursor" />
                )}
              </div>
              <div className="text-2xs text-text-muted mt-1.5">
                {formatTimestamp(msg.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {error && (
          <div className="mx-auto px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 border-t border-border-muted px-3 py-3 sm:px-4 sm:py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="p-2 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-2 transition-colors flex-shrink-0 hidden sm:flex"
              title="Clear chat"
            >
              <Trash2 size={18} />
            </button>
          )}

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Athena..."
            rows={1}
            className="flex-1 resize-none bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-base sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50 focus:ring-1 focus:ring-shell-500/20 transition-colors h-[44px] max-h-[200px]"
          />

          <button
            onClick={isStreaming ? stopStreaming : sendMessage}
            disabled={!isStreaming && !input.trim()}
            className={`w-[44px] h-[44px] rounded-xl flex-shrink-0 flex items-center justify-center transition-all ${
              isStreaming
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : input.trim()
                  ? 'bg-shell-500 text-white hover:bg-shell-600 shadow-lg shadow-shell-500/20'
                  : 'bg-surface-3 text-text-muted cursor-not-allowed'
            }`}
          >
            {isStreaming ? <Square size={18} /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
