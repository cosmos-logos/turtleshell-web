import { useState } from 'react';
import { X, Download, Sparkles, Volume2 } from 'lucide-react';
import { useAgentStore } from '@/lib/store/agent-store';
import { useChatStore } from '@/lib/store/chat-store';
import type { Agent } from '@/types/agent';

const VOICE_OPTIONS = [
  { id: 'fable', label: 'Storyteller (male)', desc: 'Warm, expressive, British quality' },
  { id: 'onyx', label: 'Commander (male)', desc: 'Deep, authoritative, powerful' },
  { id: 'echo', label: 'Resonant (male)', desc: 'Clear, warm, balanced' },
  { id: 'ballad', label: 'Tenor (male)', desc: 'Melodic, lyrical, emotive' },
  { id: 'ash', label: 'Energetic (male)', desc: 'Young, enthusiastic, clear' },
  { id: 'sage', label: 'Oracle (female)', desc: 'Calm, thoughtful, wise' },
  { id: 'shimmer', label: 'Bright (female)', desc: 'Distinctive, cheerful, lively' },
  { id: 'nova', label: 'Warm (female)', desc: 'Bright, energetic, friendly' },
  { id: 'coral', label: 'Friendly (female)', desc: 'Warm, upbeat, conversational' },
  { id: 'alloy', label: 'Neutral', desc: 'Balanced, androgynous, versatile' },
];

const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
  '#10b981', '#06b6d4', '#3b82f6', '#f97316', '#84cc16',
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateAgentModal({ open, onClose }: Props) {
  const { addAgent } = useAgentStore();
  const { switchAgent } = useChatStore();

  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('');
  const [voiceId, setVoiceId] = useState('echo');
  const [color, setColor] = useState('#6366f1');
  const [icon, setIcon] = useState('🤖');
  const [created, setCreated] = useState(false);
  const [manifestJson, setManifestJson] = useState('');

  if (!open) return null;

  const codename = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-agent';

  const buildManifest = () => ({
    cosmos_logos_version: '1.0.3',
    identity: {
      name,
      codename,
      purpose: personality.substring(0, 100),
      description: personality,
      system_prompt: personality,
      version: '1.0.0',
    },
    display: {
      color,
    },
    voice: {
      description: VOICE_OPTIONS.find(v => v.id === voiceId)?.desc || '',
      engines: {
        openai: { voice_id: voiceId, model: 'gpt-4o-mini-tts' },
      },
      preferred_engine: 'openai',
    },
    network: {
      endpoint: 'local://custom-agent',
      health: '/health',
    },
    cryptography: {
      algorithm: 'Ed25519',
      public_key: '(generate with: openssl genpkey -algorithm Ed25519)',
      signing_header: 'x-cosmos-signature',
      timestamp_header: 'x-cosmos-timestamp',
    },
    capabilities: [
      { verb: 'chat', protocol: 'openai-chat-v1', path: '/chat', description: personality.substring(0, 80) },
    ],
    trust: { ttl: 3600, agents: [] },
    envelope: { enabled: false },
    metadata: {
      tags: ['custom', 'chat'],
      created: new Date().toISOString(),
      license: 'personal',
    },
  });

  const handleCreate = () => {
    if (!name.trim() || !personality.trim()) return;

    const agent: Agent = {
      id: codename,
      name: name.trim(),
      description: personality.substring(0, 100),
      icon,
      capabilities: ['chat'],
      requiredServices: [],
      systemPrompt: personality.trim(),
      voice: {
        description: VOICE_OPTIONS.find(v => v.id === voiceId)?.desc || '',
        engines: {
          openai: { voice_id: voiceId, model: 'gpt-4o-mini-tts' },
        },
        preferred_engine: 'openai',
      },
    };

    addAgent(agent);
    switchAgent(agent.id);
    setManifestJson(JSON.stringify(buildManifest(), null, 2));
    setCreated(true);
  };

  const handleDownload = () => {
    const blob = new Blob([manifestJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${codename}.cosmos-logos.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDone = () => {
    setName('');
    setPersonality('');
    setVoiceId('echo');
    setColor('#6366f1');
    setIcon('🤖');
    setCreated(false);
    setManifestJson('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-1 border border-border-muted rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-muted">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-shell-400" />
            <h2 className="text-sm font-bold">{created ? 'Agent Created' : 'Create Your Agent'}</h2>
          </div>
          <button onClick={handleDone} className="p-1 rounded-md hover:bg-surface-2 text-text-muted">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {!created ? (
            <>
              {/* Name + Icon */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary">Agent Name</label>
                <div className="flex gap-2">
                  <input
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-12 bg-surface-2 border border-border-muted rounded-lg px-2 py-2 text-center text-lg focus:outline-none focus:border-shell-500/50"
                    maxLength={2}
                    title="Emoji icon"
                  />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jarvis, Friday, Cortana..."
                    className="flex-1 bg-surface-2 border border-border-muted rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50"
                  />
                </div>
              </div>

              {/* Personality */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary">Personality & Instructions</label>
                <textarea
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  rows={4}
                  placeholder="You are Jarvis, Tony Stark's AI assistant. You are brilliant, witty, and slightly sarcastic. Help me build my own Iron Man suit..."
                  className="w-full bg-surface-2 border border-border-muted rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50 resize-none"
                />
                <p className="text-2xs text-text-muted">This becomes the system prompt — it defines who your agent is and how it behaves.</p>
              </div>

              {/* Voice */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                  <Volume2 size={12} /> Voice
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {VOICE_OPTIONS.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setVoiceId(v.id)}
                      className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                        voiceId === v.id
                          ? 'border-shell-500/50 bg-shell-500/10 text-shell-400'
                          : 'border-border-muted bg-surface-2 text-text-muted hover:border-border hover:text-text-secondary'
                      }`}
                    >
                      <div className="font-medium">{v.label}</div>
                      <div className="text-2xs opacity-70">{v.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary">Color</label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white/30' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Create button */}
              <button
                onClick={handleCreate}
                disabled={!name.trim() || !personality.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-shell-500/10 text-shell-400 hover:bg-shell-500/20 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
              >
                <Sparkles size={16} />
                Create {name.trim() || 'Agent'}
              </button>
            </>
          ) : (
            <>
              {/* Success */}
              <div className="text-center py-4">
                <div className="text-4xl mb-3">{icon}</div>
                <h3 className="text-lg font-bold">{name}</h3>
                <p className="text-sm text-text-muted mt-1">Your agent is ready. Select it from the chat picker to start talking.</p>
              </div>

              {/* Manifest preview */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary">cosmos-logos.json</label>
                <div className="bg-surface-2 border border-border-muted rounded-lg p-3 max-h-48 overflow-y-auto">
                  <pre className="text-2xs text-text-muted font-mono whitespace-pre-wrap">{manifestJson}</pre>
                </div>
                <p className="text-2xs text-text-muted">
                  Download this file to build a standalone agent. Or just use it as a chat persona within TurtleShell.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-border-muted text-text-secondary hover:bg-surface-2 rounded-xl text-sm font-medium transition-colors"
                >
                  <Download size={14} />
                  Download Manifest
                </button>
                <button
                  onClick={handleDone}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-shell-500/10 text-shell-400 hover:bg-shell-500/20 rounded-xl text-sm font-semibold transition-colors"
                >
                  Start Chatting
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
