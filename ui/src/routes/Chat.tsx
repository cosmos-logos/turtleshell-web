import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Square, Trash2, Mic, Copy, Check, Volume2, Settings2, X, Wrench, ExternalLink, Brain, Bookmark } from 'lucide-react';
import * as audioManager from '@/lib/audio/audio-manager';
import { useChatStore } from '@/lib/store/chat-store';
import { useApolloStore } from '@/lib/store/apollo-store';
import { useEnvironmentStore } from '@/lib/store/environment-store';
import { streamChat } from '@/lib/athena/chat-client';
import { generateId, formatTimestamp } from '@/lib/utils/helpers';
import { useApollo } from '@/lib/hooks/useApollo';
import type { ChatMessage } from '@/types/chat';

// Matches "[Calling tool <name> with args <json>]" lines from Athena
const TOOL_CALL_PATTERN = /^\[Calling tool .+ with args .+\]$/;

// Splits text into segments of plain text and URLs
const URL_REGEX = /(https?:\/\/[^\s<>"')\]]+)/g;

function renderTextWithLinks(text: string): React.ReactNode[] {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      URL_REGEX.lastIndex = 0; // reset after test
      // Truncate display URL if very long
      const display = part.length > 60 ? part.slice(0, 57) + '...' : part;
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-shell-400 hover:underline break-all"
        >
          {display}
          <ExternalLink size={10} className="flex-shrink-0 inline" />
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const HOLD_THRESHOLD_MS = 400;

export function Chat() {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [isHoldingMic, setIsHoldingMic] = useState(false);
  const [showInception, setShowInception] = useState(() => !localStorage.getItem('turtleshell-inception'));
  const controlsRef = useRef<HTMLDivElement>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const didHoldRef = useRef(false);
  const { messages, isStreaming, error, addMessage, updateLastAssistantMessage, setStreaming, setError, clearMessages, setConversationId, memoryEnabled, saveConversation, setMemoryEnabled, setSaveConversation } =
    useChatStore();
  const developerMode = useEnvironmentStore((s) => s.developerMode);
  const [resumedAt] = useState(() =>
    useChatStore.getState().messages.length > 0 && useChatStore.getState().currentConversationId
      ? new Date()
      : null
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const speakRef = useRef<(text: string) => Promise<void>>(undefined);
  const sendRef = useRef<(prompt: string) => void>(undefined);

  // Talk mode → auto-send; hold-to-record → append to input for review
  const apollo = useApollo({
    onTranscript: (text) => {
      if (useApolloStore.getState().ttsTalkMode) {
        sendRef.current?.(text);
      } else {
        setInput((prev) => prev ? `${prev} ${text}` : text);
      }
    },
  });

  const handleSendMessage = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isStreaming) return;

    setInput('');
    setError(null);

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: prompt.trim(),
      timestamp: Date.now(),
    };
    addMessage(userMsg);

    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    addMessage(assistantMsg);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let accumulated = '';
      const isDev = useEnvironmentStore.getState().developerMode;
      const { currentConversationId: convId, memoryEnabled: mem, saveConversation: save } = useChatStore.getState();
      for await (const token of streamChat(prompt, controller.signal, mem ? convId : null, { memoryEnabled: mem, saveConversation: save })) {
        // Handle metadata objects (conversationId)
        if (typeof token === 'object' && 'conversationId' in token) {
          if (mem) setConversationId(token.conversationId);
          continue;
        }
        accumulated += token;
        if (isDev) {
          // Show everything in developer mode
          updateLastAssistantMessage(accumulated);
        } else {
          // Filter out tool call lines for end users
          const filtered = accumulated
            .split('\n')
            .filter((line) => !TOOL_CALL_PATTERN.test(line.trim()))
            .join('\n')
            .replace(/^\n+/, '');
          updateLastAssistantMessage(filtered);
        }
      }

      // Final filter for TTS — always strip tool calls from spoken text
      const spokenText = accumulated
        .split('\n')
        .filter((line) => !TOOL_CALL_PATTERN.test(line.trim()))
        .join('\n')
        .trim();

      if (spokenText && useApolloStore.getState().ttsAutoPlay) {
        speakRef.current?.(spokenText);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        const message = (err as Error).message;
        console.error('[Athena] Stream error:', err);

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
        updateLastAssistantMessage(`\u26a0\ufe0f ${userMessage}`);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [isStreaming, addMessage, updateLastAssistantMessage, setStreaming, setError]);

  useEffect(() => {
    speakRef.current = apollo.speak;
  }, [apollo.speak]);

  useEffect(() => {
    sendRef.current = handleSendMessage;
  }, [handleSendMessage]);

  const sendMessage = useCallback(() => {
    handleSendMessage(input);
  }, [input, handleSendMessage]);

  // Close controls panel on outside click
  useEffect(() => {
    if (!controlsOpen) return;
    const handler = (e: MouseEvent) => {
      if (controlsRef.current && !controlsRef.current.contains(e.target as Node)) {
        setControlsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [controlsOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const beginInception = useCallback(() => {
    localStorage.setItem('turtleshell-inception', '1');
    setShowInception(false);
    // Enable all auto modes for first-time users
    useApolloStore.getState().setTTSAutoPlay(true);
    useApolloStore.getState().setTTSTalkMode(true);
    useChatStore.getState().setSaveConversation(true);
    useChatStore.getState().setMemoryEnabled(true);
    // Small delay so React commits refs and talk mode mic can start after TTS
    setTimeout(() => sendRef.current?.('Who are you?'), 100);
  }, []);

  useEffect(() => {
    const pending = useChatStore.getState().consumePendingInput();
    if (pending) {
      // Auto-send pending input (from seed clicks)
      setTimeout(() => sendRef.current?.(pending), 100);
      return;
    }
    if (showInception) return; // Don't focus input — waiting for inception tap
    inputRef.current?.focus();
  }, []);

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

  // --- Hold-to-record on send button ---

  const startHoldTimer = () => {
    didHoldRef.current = false;
    holdTimerRef.current = setTimeout(() => {
      didHoldRef.current = true;
      setIsHoldingMic(true);
      apollo.startListening();
    }, HOLD_THRESHOLD_MS);
  };

  const endHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = undefined;
    }
    if (didHoldRef.current) {
      // Was recording — stop mic, transcription appends to input via onTranscript
      apollo.stopListening();
      setIsHoldingMic(false);
      didHoldRef.current = false;
      // Don't send — user reviews transcription and clicks send
    }
    // If it was a short click (not a hold), the onClick handler fires normally
  };

  const handleSendPointerDown = (e: React.PointerEvent) => {
    if (isStreaming) return; // stop button doesn't do hold
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startHoldTimer();
  };

  const handleSendPointerUp = () => {
    endHold();
  };

  const handleSendClick = () => {
    if (didHoldRef.current) return; // was a hold, not a click
    if (isStreaming) {
      stopStreaming();
    } else if (apollo.isPlaying || useApolloStore.getState()._isBuffering) {
      audioManager.cancel();
    } else {
      sendMessage();
    }
  };

  // Cleanup hold timer on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  // Determine send button state
  const isBuffering = useApolloStore((s) => s._isBuffering);
  const isAudioActive = apollo.isPlaying || isBuffering;

  const sendButtonIcon = isStreaming
    ? <Square size={18} />
    : isAudioActive
      ? <X size={18} />
      : isHoldingMic
        ? <Mic size={18} />
        : <Send size={18} />;

  const sendButtonClass = isStreaming
    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
    : isAudioActive
      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
      : isHoldingMic
        ? 'bg-shell-500/20 text-shell-400 animate-pulse'
        : input.trim()
          ? 'bg-shell-500 text-white hover:bg-shell-600'
          : 'bg-surface-3 text-text-muted cursor-not-allowed';

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Messages area */}
      <div ref={scrollRef} className="chat-container space-y-4">
        {messages.length === 0 && showInception && (
          <div className="flex-1 flex items-center justify-center min-h-[60vh]">
            <button
              onClick={beginInception}
              className="text-center space-y-4 group cursor-pointer focus:outline-none"
            >
              <div className="text-6xl transition-transform group-hover:scale-110 group-active:scale-95">
                {'\ud83d\udc22'}
              </div>
              <h2 className="text-xl font-semibold text-text-primary">
                Tap to begin
              </h2>
              <p className="text-sm text-text-muted max-w-md">
                TurtleShell.ai will introduce itself, then listen for your voice.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-shell-500 text-white text-sm font-semibold rounded-lg group-hover:bg-shell-600 transition-all group-hover:-translate-y-px group-hover:shadow-lg group-hover:shadow-shell-500/30">
                <Mic size={16} />
                Start Conversation
              </div>
            </button>
          </div>
        )}

        {messages.length === 0 && !showInception && (
          <div className="flex-1 flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="text-5xl">{'\ud83d\udc22'}</div>
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

        {resumedAt && messages.length > 0 && (
          <div className="flex items-center gap-3 py-2 text-text-muted/40 text-2xs select-none">
            <div className="flex-1 border-t border-border-muted/30" />
            <span>Resumed · {resumedAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <div className="flex-1 border-t border-border-muted/30" />
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`message-bubble group ${
                msg.role === 'user'
                  ? 'message-bubble-user'
                  : 'message-bubble-assistant'
              }`}
            >
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.role === 'assistant' && developerMode
                  ? msg.content.split('\n').map((line, i, arr) => {
                      const isToolCall = TOOL_CALL_PATTERN.test(line.trim());
                      if (isToolCall) {
                        return (
                          <div key={i} className="flex items-start gap-1.5 my-1 px-2 py-1 bg-yellow-500/5 border border-yellow-500/10 rounded text-2xs font-mono text-text-muted">
                            <Wrench size={10} className="flex-shrink-0 mt-0.5 text-yellow-500/50" />
                            <span>{line}</span>
                          </div>
                        );
                      }
                      return <span key={i}>{renderTextWithLinks(line)}{i < arr.length - 1 ? '\n' : ''}</span>;
                    })
                  : renderTextWithLinks(msg.content)
                }
                {msg.isStreaming && isStreaming && (
                  <span className="streaming-cursor" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-2xs text-text-muted">
                  {formatTimestamp(msg.timestamp)}
                </span>
                {msg.content && !(msg.isStreaming && isStreaming) && (
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(msg.content);
                        setCopiedId(msg.id);
                        setTimeout(() => setCopiedId(null), 1500);
                      }}
                      className="p-0.5 rounded text-text-muted/30 hover:text-text-muted transition-colors"
                      title="Copy"
                    >
                      {copiedId === msg.id ? <Check size={10} /> : <Copy size={10} />}
                    </button>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => apollo.speak(msg.content)}
                        className="p-0.5 rounded text-text-muted/30 hover:text-text-muted transition-colors"
                        title="Play audio"
                      >
                        <Volume2 size={10} />
                      </button>
                    )}
                  </div>
                )}
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

      {/* Mic status */}
      {apollo.isTalkMode && (
        <div className="flex-shrink-0 px-3 sm:px-4">
          <div className="max-w-3xl mx-auto flex items-center justify-center gap-2 py-1.5 text-2xs">
            {apollo.micError ? (
              <span className="text-red-400">{apollo.micError}</span>
            ) : apollo.isListening ? (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-text-muted">Listening...</span>
              </>
            ) : apollo.isPlaying ? (
              <span className="text-text-muted">Speaking...</span>
            ) : (
              <span className="text-text-muted/50">Mic idle</span>
            )}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="flex-shrink-0 border-t border-border-muted px-3 py-3 sm:px-4 sm:py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          {/* Voice controls popover */}
          <div className="relative flex-shrink-0" ref={controlsRef}>
            <button
              onClick={() => setControlsOpen(!controlsOpen)}
              className={`p-2 rounded-lg transition-colors ${
                apollo.isPlaying
                  ? 'text-shell-400 bg-shell-500/20 animate-pulse'
                  : apollo.ttsAutoPlay || apollo.isTalkMode
                    ? 'text-shell-400 bg-shell-500/10'
                    : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'
              }`}
              title="Voice controls"
            >
              <Settings2 size={18} />
            </button>

            {controlsOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-52 bg-surface-1 border border-border-muted rounded-xl shadow-lg shadow-black/30 p-2 space-y-1 animate-fade-in z-30">
                {/* Auto-Play */}
                <button
                  onClick={() => useApolloStore.getState().setTTSAutoPlay(!apollo.ttsAutoPlay)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-left ${
                    apollo.ttsAutoPlay
                      ? 'text-shell-400 bg-shell-500/10'
                      : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'
                  }`}
                >
                  <Volume2 size={15} className="flex-shrink-0" />
                  <div>
                    <div className="text-xs font-medium">Auto-Play</div>
                    <div className="text-[9px] text-text-muted/60">Speak responses aloud</div>
                  </div>
                  <div className={`ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 ${apollo.ttsAutoPlay ? 'bg-shell-400' : 'bg-surface-3'}`} />
                </button>

                {/* Talk Mode */}
                <button
                  onClick={() => useApolloStore.getState().setTTSTalkMode(!apollo.isTalkMode)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-left ${
                    apollo.isTalkMode
                      ? 'text-shell-400 bg-shell-500/10'
                      : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'
                  }`}
                >
                  <Mic size={15} className="flex-shrink-0" />
                  <div>
                    <div className="text-xs font-medium">Talk Mode</div>
                    <div className="text-[9px] text-text-muted/60">Hands-free voice loop</div>
                  </div>
                  <div className={`ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 ${apollo.isTalkMode ? 'bg-shell-400' : 'bg-surface-3'}`} />
                </button>

                {/* Memory */}
                <button
                  onClick={() => setMemoryEnabled(!memoryEnabled)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-left ${
                    memoryEnabled
                      ? 'text-shell-400 bg-shell-500/10'
                      : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'
                  }`}
                >
                  <Brain size={15} className="flex-shrink-0" />
                  <div>
                    <div className="text-xs font-medium">Memory</div>
                    <div className="text-[9px] text-text-muted/60">Remember conversation context</div>
                  </div>
                  <div className={`ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 ${memoryEnabled ? 'bg-shell-400' : 'bg-surface-3'}`} />
                </button>

                {/* Auto-Save */}
                <button
                  onClick={() => setSaveConversation(!saveConversation)}
                  disabled={!memoryEnabled}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-left ${
                    !memoryEnabled
                      ? 'opacity-40 pointer-events-none text-text-muted'
                      : saveConversation
                        ? 'text-shell-400 bg-shell-500/10'
                        : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'
                  }`}
                >
                  <Bookmark size={15} className="flex-shrink-0" />
                  <div>
                    <div className="text-xs font-medium">Auto-Save</div>
                    <div className="text-[9px] text-text-muted/60">Save conversations to history</div>
                  </div>
                  <div className={`ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 ${saveConversation ? 'bg-shell-400' : 'bg-surface-3'}`} />
                </button>

                {/* Clear Chat */}
                {messages.length > 0 && (
                  <>
                    <div className="border-t border-border-muted/30 my-1" />
                    <button
                      onClick={() => { clearMessages(); setControlsOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-left text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 size={15} className="flex-shrink-0" />
                      <div>
                        <div className="text-xs font-medium">Clear Chat</div>
                        <div className="text-[9px] text-text-muted/60">Delete all messages</div>
                      </div>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Athena..."
            rows={1}
            className="flex-1 resize-none bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-base sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50 focus:ring-1 focus:ring-shell-500/20 transition-colors h-[44px] max-h-[200px] scrollbar-none"
          />

          {/* Send button — tap to send, hold to record */}
          <button
            onPointerDown={handleSendPointerDown}
            onPointerUp={handleSendPointerUp}
            onPointerCancel={endHold}
            onClick={handleSendClick}
            disabled={!isStreaming && !isAudioActive && !input.trim() && !isHoldingMic}
            className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center transition-all select-none touch-none ${sendButtonClass}`}
          >
            {sendButtonIcon}
          </button>
        </div>
      </div>
    </div>
  );
}
