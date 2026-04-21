import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Send, Square, Trash2, Mic, Copy, Check, Volume2, Settings2, X, Wrench, ExternalLink, Brain, Bookmark, Shell, Shuffle } from 'lucide-react';
import { plutusClient, type QuotaResponse } from '@/lib/api/plutus-client';
import { getShellId } from '@/lib/api/olympus-grid-client';
import * as audioManager from '@/lib/audio/audio-manager';
import { useChatStore } from '@/lib/store/chat-store';
import { useApolloStore } from '@/lib/store/apollo-store';
import { useEnvironmentStore } from '@/lib/store/environment-store';
import { streamChat } from '@/lib/athena/chat-client';
import { streamDirect, hasDirectProvider } from '@/lib/providers/direct-chat';
import { hasUserApiKey } from '@/lib/store/agent-store';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import { useAgentStore } from '@/lib/store/agent-store';
import { isAthenaFamily } from '@/lib/agent-scope';
import { useChatPreferencesStore } from '@/lib/store/chat-preferences-store';
import { useAgentThemeStore } from '@/lib/store/agent-theme-store';
import { OLYMPUS_AGENTS } from '@/lib/agents/olympus-data';
import { generateId, formatTimestamp } from '@/lib/utils/helpers';
import { useApollo } from '@/lib/hooks/useApollo';
import type { ChatMessage } from '@/types/chat';

// Matches "[Calling tool <name> with args <json>]" lines from Athena
const TOOL_CALL_PATTERN = /^\[Calling tool .+ with args .+\]$/;

const OCEAN_EMOJIS: Record<string, string> = {
  'athena-616': '🐙', 'poseidon-616': '🔱', 'apollo-616': '🐬',
  cosmos: '🐟', logos: '🐢',
};

// Pronoun lookup for "<agent> will introduce <pronoun>" copy. Case-insensitive
// match on the display name. Unknowns get the neutral "themselves" — safe
// across custom/BYOK agents where the user picked the name.
const AGENT_PRONOUNS: Record<string, string> = {
  athena: 'herself',
  apollo: 'himself',
  poseidon: 'himself',
  ares: 'himself',
  hermes: 'himself',
  zeus: 'himself',
  logos: 'himself',
  cosmos: 'itself',
  mnemosyne: 'herself',
};
// `pronounFor` was used by the removed inception empty-state. The
// AGENT_PRONOUNS map stays in case we reintroduce it — cheap and
// descriptive — but the helper function was dead code under noUnused.
void AGENT_PRONOUNS;

// Returning-user empty-state prompts — rotate per mount so the CTA never
// feels rote. Clicking the button sends the current prompt to the agent;
// a 🎲 shuffle button next to it swaps the visible suggestion without
// sending. Keep entries short and open-ended so they work for any agent.
const WELCOME_PROMPTS: readonly string[] = [
  'Tell me about myself',
  'Tell me something random',
  'Tell me about yourself',
  'Surprise me',
  'What should I do today?',
  'Help me start something new',
  'What have we talked about?',
  'What\u2019s worth my attention right now?',
];

/** Resolve the avatar emoji for the active agent, respecting theme setting */
function useAgentAvatar(): string {
  const activeAgent = useAgentStore((s) => s.activeAgent);
  const activeCosmos = useCosmosLogosStore((s) => s.activeChatAgentId);
  const cosmosAgents = useCosmosLogosStore((s) => s.agents);
  const agentTheme = useAgentThemeStore((s) => s.agentTheme);

  // Cosmos-logos connected agent (e.g. Athena-616)
  if (activeCosmos) {
    const ca = cosmosAgents.find(a => a.id === activeCosmos);
    if (ca) {
      const codename = ca.manifest.identity.codename;
      if (agentTheme === 'olympus') {
        const oa = OLYMPUS_AGENTS.find(o => codename.startsWith(o.codename) || o.codename.startsWith(codename));
        if (oa) return oa.godEmoji;
      }
      if (agentTheme === 'ocean') return OCEAN_EMOJIS[codename] ?? ca.manifest.identity.name.charAt(0);
      return ca.manifest.identity.name.charAt(0);
    }
  }

  // Built-in agent
  if (agentTheme === 'olympus') {
    const oa = OLYMPUS_AGENTS.find(o => o.codename === activeAgent.id || o.codename === activeAgent.id + '-616');
    if (oa) return oa.godEmoji;
  }
  if (agentTheme === 'ocean') return OCEAN_EMOJIS[activeAgent.id] ?? activeAgent.icon ?? '🐢';
  if (agentTheme === 'standard') return activeAgent.name.charAt(0).toUpperCase();

  return activeAgent.icon || '🐢';
}

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
  const [searchParams, setSearchParams] = useSearchParams();
  const setActiveChatAgent = useCosmosLogosStore((s) => s.setActiveChatAgent);

  const switchChatAgent = useChatStore((s) => s.switchAgent);

  const { setActiveAgent: setBuiltinActive, agents: allBuiltinAgents } = useAgentStore();

  // If navigated with ?agent=id (cosmos) or ?agent_builtin=id, activate that agent
  useEffect(() => {
    const cosmosParam = searchParams.get('agent');
    const builtinParam = searchParams.get('agent_builtin');
    if (cosmosParam) {
      setActiveChatAgent(cosmosParam);
      switchChatAgent(cosmosParam);
      setSearchParams({}, { replace: true });
    } else if (builtinParam) {
      const found = allBuiltinAgents.find(a => a.id === builtinParam);
      if (found) {
        setActiveChatAgent(null);
        setBuiltinActive(found);
        switchChatAgent(builtinParam);
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setActiveChatAgent, switchChatAgent, setSearchParams, setBuiltinActive, allBuiltinAgents]);

  // Post-subscribe celebration — Stripe success_url lands here with
  // ?welcome=<tier>. Show a transient banner for 6s then drop the param
  // so a refresh doesn't re-trigger it. Pure UI — no server call.
  const [welcomeTier, setWelcomeTier] = useState<string | null>(null);
  useEffect(() => {
    const w = searchParams.get('welcome');
    if (!w) return;
    setWelcomeTier(w);
    setSearchParams({}, { replace: true });
    const t = setTimeout(() => setWelcomeTier(null), 6000);
    return () => clearTimeout(t);
  }, [searchParams, setSearchParams]);

  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [isHoldingMic, setIsHoldingMic] = useState(false);
  // Rotating welcome-prompt CTA — "I'm Feeling Lucky" style. Random starting
  // index per mount so returning users see a different suggestion each visit;
  // 🎲 button cycles to the next one client-side without sending.
  //
  // The old "Tap to begin / Who are you?" inception flow was removed — the
  // empty state is now always the "Ready when you are." screen with a
  // rotating suggestion + shuffle. Onboarding already seeds memory/auto-save
  // defaults, so the inception's auto-enable side effects were redundant.
  const [promptIdx, setPromptIdx] = useState(() => Math.floor(Math.random() * WELCOME_PROMPTS.length));
  // Non-null assertion is safe — promptIdx is always `% WELCOME_PROMPTS.length`
  // so the index is always in bounds. Required because strict TS with
  // noUncheckedIndexedAccess widens array access to `T | undefined`.
  const rotatingPrompt = WELCOME_PROMPTS[promptIdx]!;
  const shufflePrompt = () => setPromptIdx(i => (i + 1) % WELCOME_PROMPTS.length);
  const controlsRef = useRef<HTMLDivElement>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const didHoldRef = useRef(false);
  const { messages, isStreaming, error, addMessage, updateLastAssistantMessage, setStreaming, setError, clearMessages, newThread, setConversationId, memoryEnabled, saveConversation, setMemoryEnabled, setSaveConversation } =
    useChatStore();
  const developerMode = useEnvironmentStore((s) => s.developerMode);
  const showAvatars = useChatPreferencesStore((s) => s.showAgentAvatars);
  const agentAvatar = useAgentAvatar();
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
  const hasTTS = useCosmosLogosStore((s) => s.agents.some(a => a.capabilities.includes('x-tts')));
  const activeCosmosChatName = useCosmosLogosStore((s) => {
    if (!s.activeChatAgentId) return null;
    const agent = s.agents.find(a => a.id === s.activeChatAgentId);
    return agent ? (agent.displayName || agent.manifest.identity.name) : null;
  });
  const activeBuiltinName = useAgentStore((s) => s.activeAgent.name);
  const chatAgentName = activeCosmosChatName || activeBuiltinName;
  const hiddenAgentIds = useAgentStore((s) => s.hiddenAgentIds);
  const activeThreadAgentId = useChatStore((s) => s.activeAgentId);
  const isActiveAgentHidden = hiddenAgentIds.has(activeThreadAgentId);

  // Shell-burndown gate — block chat when user is out of Sea Shells.
  // Front-end only (no Ares enforcement yet). Triggers on Plutus `blocked`
  // OR on `shells_remaining <= 0` for non-free, non-unlimited tiers.
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  useEffect(() => {
    const fetchQuota = () => plutusClient.getQuota(getShellId()).then(setQuota).catch(() => {});
    fetchQuota();
    const interval = setInterval(fetchQuota, 15000);
    window.addEventListener('shells:updated', fetchQuota);
    return () => { clearInterval(interval); window.removeEventListener('shells:updated', fetchQuota); };
  }, []);
  const isOutOfShells = (() => {
    if (!quota) return false;
    if (quota.blocked) return true;
    // Paid tier ran out of shells
    const isUnlimited = quota.shells_remaining === null || quota.shells_remaining === undefined;
    if (!isUnlimited && quota.tier !== 'free' && (quota.shells_remaining ?? 0) <= 0) return true;
    return false;
  })();

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
    if (isOutOfShells) {
      setError('You are out of Sea Shells. Upgrade to continue.');
      return;
    }

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
      // Inject system_prompt: cosmos agent manifest > built-in agent > none.
      // Athena is the exception — its server-side v1.7.7 Consciousness soul
      // is the authoritative identity and is richer than the bare manifest
      // prompt (memory recall, profile facts, MCP guidance). Skip sending a
      // client override for athena-family agents so the soul wins. For
      // Cosmos, Logos, BYOK, and future personas, the manifest system_prompt
      // IS the identity and is sent as a persona override.
      const activeChatAgentId = useCosmosLogosStore.getState().activeChatAgentId;
      const cosmosAgent = activeChatAgentId
        ? useCosmosLogosStore.getState().agents.find(a => a.id === activeChatAgentId)
        : null;
      const builtinAgent = useAgentStore.getState().activeAgent;
      const cosmosCodename = cosmosAgent?.manifest?.identity?.codename;
      const cosmosPrompt = cosmosAgent?.manifest?.identity?.system_prompt;
      const builtinPrompt = builtinAgent?.systemPrompt;
      const systemPrompt = isAthenaFamily(cosmosCodename)
        ? undefined
        : (cosmosPrompt || builtinPrompt || undefined);
      // Route decision: direct provider call OR Athena proxy
      // If user has their own API key for a provider, call it directly (no Athena)
      const useDirectProvider = !activeChatAgentId
        && hasDirectProvider(builtinAgent.id)
        && hasUserApiKey(builtinAgent.id);

      // For cosmos-logos store agents, send the codename so Athena's
      // resolveProvider (AGENTS table) picks the right entry and stamps
      // memory/history/Plutus records under that persona. Athena-family
      // codenames collapse to the bare 'athena' key since AGENTS['athena-616']
      // doesn't exist — only 'athena' does, and it routes to OpenAI.
      const llmAgentId = activeChatAgentId
        ? (isAthenaFamily(cosmosCodename) ? 'athena' : (cosmosCodename || 'athena'))
        : (['claude', 'openai', 'grok', 'gemini'].includes(builtinAgent.id) ? builtinAgent.id : 'athena');

      // Cosmos-logos agent URL takes precedence over builtin endpoint
      const agentEndpoint = cosmosAgent?.url || builtinAgent.endpoint;
      console.log('[CHAT] agent:', activeChatAgentId || builtinAgent.id,
        useDirectProvider ? '→ DIRECT' : `→ Athena (${llmAgentId})`,
        agentEndpoint ? `endpoint: ${agentEndpoint}` : '',
        'systemPrompt:', systemPrompt ? systemPrompt.substring(0, 50) + '...' : '(none)');

      // Choose streaming source
      const tokenStream = useDirectProvider
        ? streamDirect(builtinAgent.id, prompt, controller.signal, { systemPrompt })
        : streamChat(prompt, controller.signal, mem ? convId : null, { memoryEnabled: mem, saveConversation: save, systemPrompt, agentId: llmAgentId, endpointOverride: agentEndpoint });

      for await (const token of tokenStream) {
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

      const ttsConnected = useCosmosLogosStore.getState().agents.some(a => a.capabilities.includes('x-tts'));
      if (spokenText && ttsConnected && useApolloStore.getState().ttsAutoPlay) {
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
      // Notify sidebar badge to refresh shell balance
      window.dispatchEvent(new CustomEvent('shells:updated'));
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

  useEffect(() => {
    const pending = useChatStore.getState().consumePendingInput();
    if (pending) {
      // Auto-send pending input (from seed clicks)
      setTimeout(() => sendRef.current?.(pending), 100);
      return;
    }
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
      {welcomeTier && (
        <div className="mx-auto mt-4 max-w-md w-full px-4">
          <div className="rounded-xl bg-gradient-to-r from-shell-500/15 to-amber-500/15 border border-shell-500/40 px-4 py-3 text-center shadow-lg shadow-shell-500/10">
            <div className="text-2xl mb-1">🐚</div>
            <div className="text-sm font-semibold text-text-primary">
              Welcome to the ocean — you're on the <span className="text-shell-400 capitalize">{welcomeTier}</span> tide.
            </div>
            <div className="text-xs text-text-muted mt-1">Your shells are ready. Your guide is waiting.</div>
          </div>
        </div>
      )}
      {/* Messages area */}
      <div ref={scrollRef} className="chat-container space-y-4">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-5 max-w-md px-4">
              <div className="text-6xl">{agentAvatar}</div>
              <h2 className="text-xl font-semibold text-text-primary">
                Ready when you are.
              </h2>
              <p className="text-sm text-text-muted">
                Ask {chatAgentName} anything — or let her surprise you.
              </p>
              {/* "I'm Feeling Lucky" style rotating CTA. Click the pill to
                  send the current suggestion; click the 🎲 to cycle to
                  another without sending. */}
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => handleSendMessage(rotatingPrompt)}
                  disabled={isStreaming || isOutOfShells}
                  className="group inline-flex items-center gap-2 px-5 py-2.5 bg-shell-500 text-white text-sm font-semibold rounded-full hover:bg-shell-600 transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-shell-500/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  <Send size={14} className="opacity-80" />
                  {rotatingPrompt}
                </button>
                <button
                  onClick={shufflePrompt}
                  aria-label="Shuffle suggestion"
                  className="p-2.5 rounded-full bg-surface-2 text-text-muted hover:text-text-primary hover:bg-surface-3 transition-all hover:rotate-180 duration-300"
                  title="Another one"
                >
                  <Shuffle size={14} />
                </button>
              </div>
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
            className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && showAvatars && (
              <div className="w-8 h-8 rounded-full bg-surface-2 border border-border-muted flex items-center justify-center text-lg shrink-0 mt-0.5">
                {agentAvatar}
              </div>
            )}
            {/* Column wrapping the bubble + metadata. `max-w-[75%]` caps
                the bubble at 75% of the row so long assistant messages
                don't span full-width, while short user messages hug
                their content naturally (thanks to flex-col items-end).
                The bubble itself no longer carries `max-w-[85%]` — that
                CSS-level cap compounded with the column and produced
                ~72% of the row, forcing even short text like "Tell me
                something random" to wrap to two lines. */}
            <div
              className={`flex flex-col gap-1 max-w-[75%] ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
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
              </div>
              {/* Metadata row — OUTSIDE the message-bubble. Timestamp
                  + copy + play are system chrome, not part of the speech
                  act; keeping them on the neutral background makes the
                  bubble's color a pure identity cue. Copy is available
                  for both user and assistant messages — the user should
                  be able to grab either side of the conversation. */}
              <div className="flex items-center gap-2">
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
                      className="p-0.5 rounded text-text-muted hover:text-text-primary transition-colors"
                      title="Copy"
                    >
                      {copiedId === msg.id ? <Check size={10} /> : <Copy size={10} />}
                    </button>
                    {msg.role === 'assistant' && hasTTS && (
                      <button
                        onClick={() => apollo.speak(msg.content)}
                        className="p-0.5 rounded text-text-muted hover:text-text-primary transition-colors"
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

      {/* Mic status — only when TTS agent is connected */}
      {apollo.isTalkMode && hasTTS && (
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
                {/* Auto-Play — only when TTS agent connected */}
                {hasTTS && (
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
                )}

                {/* Talk Mode — only when TTS agent connected */}
                {hasTTS && (
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
                )}

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

                {/* New Thread / Clear Chat */}
                {messages.length > 0 && (
                  <>
                    <div className="border-t border-border-muted/30 my-1" />
                    <button
                      onClick={() => { newThread(); setControlsOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-left text-text-muted hover:text-text-primary hover:bg-surface-2"
                    >
                      <Send size={15} className="flex-shrink-0" />
                      <div>
                        <div className="text-xs font-medium">New Thread</div>
                        <div className="text-[9px] text-text-muted/60">Start a fresh conversation</div>
                      </div>
                    </button>
                    <button
                      onClick={() => { clearMessages(); setControlsOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-left text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 size={15} className="flex-shrink-0" />
                      <div>
                        <div className="text-xs font-medium">Clear Chat</div>
                        <div className="text-[9px] text-text-muted/60">Delete this agent's messages</div>
                      </div>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {isOutOfShells ? (
            <div className="flex-1 flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <Shell size={18} className="flex-shrink-0 text-red-400" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-red-300 truncate">
                    You're out of Sea Shells.
                  </div>
                  <div className="text-xs text-red-400/70 truncate">
                    Top up to keep the conversation going.
                  </div>
                </div>
              </div>
              <Link
                to="/app/shells"
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-shell-400 text-black hover:bg-shell-300 transition-colors no-underline whitespace-nowrap"
              >
                Get More 🐚
              </Link>
            </div>
          ) : isActiveAgentHidden ? (
            <div className="flex-1 bg-surface-2 border border-border-muted rounded-xl px-4 py-2.5 text-sm text-text-muted/60 italic">
              This conversation is read-only — {chatAgentName} is not currently active. Enable in Agent Setup to continue.
            </div>
          ) : (
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${chatAgentName}...`}
              rows={1}
              className="flex-1 resize-none bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-base sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50 focus:ring-1 focus:ring-shell-500/20 transition-colors h-[44px] max-h-[200px] scrollbar-none"
            />
          )}

          {/* Send button — tap to send, hold to record */}
          {!isActiveAgentHidden && !isOutOfShells && <button
            onPointerDown={handleSendPointerDown}
            onPointerUp={handleSendPointerUp}
            onPointerCancel={endHold}
            onClick={handleSendClick}
            disabled={!isStreaming && !isAudioActive && !input.trim() && !isHoldingMic}
            className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center transition-all select-none touch-none ${sendButtonClass}`}
          >
            {sendButtonIcon}
          </button>}
        </div>
      </div>
    </div>
  );
}
