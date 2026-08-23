// src/components/settings/AgentSettingsSheet.tsx
//
// Per-agent credential manager. Steward directive 2026-07-09: sovereignty
// is agent-anchored. This sheet is opened from an agent's settings gear
// and lets the user configure BYOK credentials scoped to THAT agent (its
// Ed25519 pubkey is the crypto identity that seals everything inside).
//
// Multi-agent future: adding another agent adds another card to Settings,
// each card opens its own AgentSettingsSheet. Sealed credentials never
// cross agent boundaries because they're keyed by pubkey fingerprint at
// the storage layer (see secure-storage.slotKey).
//
// Structure:
//   • Identity header — displayName + codename + endpoint URL
//   • LLM providers row → opens ProviderChooser(category='chat', manifestUrl)
//   • TTS providers row → opens ProviderChooser(category='voice', manifestUrl)
//
// If an agent's manifest declares only chat OR only voice, the other row
// hides. Today Athena declares chat; Apollo declares voice (Apollo's shown
// in its own "Your Sound" section — this sheet is for chat agents).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Mic, ShieldCheck, Wrench, X } from 'lucide-react';
import { ProviderChooser } from './ProviderChooser';
import { useSovereignAiStore } from '@/lib/store/sovereign-ai-store';
import { chatProviderByKey, voiceProviderByKey } from '@/lib/sovereign-ai/provider-catalog';

interface Props {
  /** Display name for the header (e.g. "Athena"). */
  agentName: string;
  /** Manifest URL for this agent's chat capability. When undefined, the
   *  LLM providers row is hidden. */
  chatManifestUrl?: string;
  /** Manifest URL for this agent's voice capability. When undefined, the
   *  TTS providers row is hidden. */
  voiceManifestUrl?: string;
  /** Scope label suffix like "at Local Dev Tunnel" — cosmetic. */
  scopeSuffix?: string;
  open: boolean;
  onClose: () => void;
}

export function AgentSettingsSheet({
  agentName,
  chatManifestUrl,
  voiceManifestUrl,
  scopeSuffix,
  open,
  onClose,
}: Props) {
  const [openCategory, setOpenCategory] = useState<'chat' | 'voice' | null>(null);
  const navigate = useNavigate();
  const chatProvider = useSovereignAiStore((s) => s.chatProvider);
  const voiceProvider = useSovereignAiStore((s) => s.voiceProvider);
  const chatProviderName = chatProviderByKey(chatProvider)?.displayName ?? 'Olympus-Grid';
  const voiceProviderName = voiceProviderByKey(voiceProvider)?.displayName ?? 'Olympus-Grid';
  const isChatSovereign = chatProvider !== 'olympus-grid';
  const isVoiceSovereign = voiceProvider !== 'olympus-grid';

  if (!open) return null;

  const scopeLabel = scopeSuffix ? `${agentName} ${scopeSuffix}` : agentName;

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg bg-surface-1 border border-shell-500/40 rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-border-muted flex items-center gap-3">
            <ShieldCheck size={18} className="text-shell-400" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-shell-300">Manage {agentName}</h2>
              <div className="text-2xs text-text-muted mt-0.5">
                Credentials sealed here can only be opened by <span className="text-shell-400/80">{agentName}</span>.
                {scopeSuffix ? ` ${scopeSuffix}.` : ''}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary p-1"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-6 space-y-3">
            {chatManifestUrl && (
              <button
                onClick={() => setOpenCategory('chat')}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-surface-2/40 border border-border-muted hover:border-shell-500/40 transition-colors text-left"
              >
                <Brain size={16} className="flex-shrink-0 text-shell-400" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    LLM providers
                    <span className={`text-2xs font-normal px-1.5 py-0.5 rounded-full ${
                      isChatSovereign
                        ? 'bg-shell-500/15 text-shell-400 border border-shell-500/30'
                        : 'bg-surface-3 text-text-muted border border-border-muted'
                    }`}>
                      {chatProviderName}{isChatSovereign ? ' · your key' : ''}
                    </span>
                  </div>
                  <div className="text-2xs text-text-muted mt-0.5">
                    Bring your own OpenAI, Anthropic, Grok, Gemini, or Ollama —
                    sealed for {agentName}.
                  </div>
                </div>
                <span className="text-xs text-text-muted">Change ›</span>
              </button>
            )}

            {voiceManifestUrl && (
              <button
                onClick={() => setOpenCategory('voice')}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-surface-2/40 border border-border-muted hover:border-shell-500/40 transition-colors text-left"
              >
                <Mic size={16} className="flex-shrink-0 text-shell-400" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    TTS providers
                    <span className={`text-2xs font-normal px-1.5 py-0.5 rounded-full ${
                      isVoiceSovereign
                        ? 'bg-shell-500/15 text-shell-400 border border-shell-500/30'
                        : 'bg-surface-3 text-text-muted border border-border-muted'
                    }`}>
                      {voiceProviderName}{isVoiceSovereign ? ' · your key' : ''}
                    </span>
                  </div>
                  <div className="text-2xs text-text-muted mt-0.5">
                    Bring your own OpenAI TTS, ElevenLabs, or XTTS server —
                    sealed for {agentName}.
                  </div>
                </div>
                <span className="text-xs text-text-muted">Change ›</span>
              </button>
            )}

            {/* MCP providers — tool credentials (Salesforce OAuth, Google
                Workspace, GitHub token, etc.) sealed to Poseidon's pubkey.
                Steward 2026-07-09: same primitive as LLM + TTS, different
                god. For now this row navigates to the existing Tools page
                which handles the OAuth flows; the goal is to absorb that
                surface into this modal in a follow-up so the agent → MCP
                server → tool credential hierarchy is visible in one place. */}
            {chatManifestUrl && (
              <button
                onClick={() => {
                  onClose();
                  navigate('/app/tools');
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-surface-2/40 border border-border-muted hover:border-shell-500/40 transition-colors text-left"
              >
                <Wrench size={16} className="flex-shrink-0 text-shell-400" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text-primary">MCP providers</div>
                  <div className="text-2xs text-text-muted mt-0.5">
                    Bring your Salesforce, Google Workspace, GitHub, or any
                    other tool credential — sealed for the MCP server this
                    agent talks to (Poseidon).
                  </div>
                </div>
                <span className="text-xs text-text-muted">Manage ›</span>
              </button>
            )}

            {!chatManifestUrl && !voiceManifestUrl && (
              <div className="text-2xs text-text-muted italic text-center py-4">
                This agent doesn't declare any sovereign credentials.
              </div>
            )}

            <div className="pt-2 text-2xs text-text-muted italic text-center">
              Every credential you paste here becomes ciphertext at that moment.
              This browser can no longer read it. Only {agentName} can open it —
              and only for the duration of one request.
            </div>
          </div>
        </div>
      </div>

      {openCategory === 'chat' && chatManifestUrl && (
        <ProviderChooser
          category="chat"
          manifestUrl={chatManifestUrl}
          scopeLabel={scopeLabel}
          open={true}
          onClose={() => setOpenCategory(null)}
        />
      )}
      {openCategory === 'voice' && voiceManifestUrl && (
        <ProviderChooser
          category="voice"
          manifestUrl={voiceManifestUrl}
          scopeLabel={scopeLabel}
          open={true}
          onClose={() => setOpenCategory(null)}
        />
      )}
    </>
  );
}
