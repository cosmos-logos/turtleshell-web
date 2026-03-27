import { Cloud, House, Info, Volume2, Sun, Moon, Brain, Wrench, Server } from 'lucide-react';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import {
  useEnvironmentStore,
  SERVICE_LABELS,
  type AppEnvironment,
  type ServiceEndpoints,
} from '@/lib/store/environment-store';
import { useApolloStore } from '@/lib/store/apollo-store';
import { useChatStore } from '@/lib/store/chat-store';
import { useThemeStore } from '@/lib/store/theme-store';

const PRESETS: { key: AppEnvironment; label: string; desc: string; Icon: React.ElementType }[] = [
  { key: 'cloud',   label: 'Cloud',    desc: 'AWS Olympus-Grid',   Icon: Cloud },
  { key: 'offgrid', label: 'Off-Grid', desc: 'ngrok / local stack', Icon: House },
];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-shell-500' : 'bg-surface-3'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
          on ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );
}

export function Settings() {
  const {
    current,
    endpoints,
    developerMode,
    setEnvironment,
    setEndpoint,
    setDeveloperMode,
  } = useEnvironmentStore();

  const { theme, setTheme } = useThemeStore();
  const { memoryEnabled, setMemoryEnabled } = useChatStore();
  const { ttsAutoPlay, ttsTalkMode, setTTSAutoPlay, setTTSTalkMode } = useApolloStore();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-text-muted mt-1">
            Configure your TurtleShell.ai experience.
          </p>
        </div>

        {/* Appearance */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />} Appearance
          </h2>
          <div className="p-4 bg-surface-1 border border-border-muted rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Dark Mode</div>
                <div className="text-2xs text-text-muted mt-0.5">
                  Switch between light and dark theme
                </div>
              </div>
              <Toggle on={theme === 'dark'} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
            </div>
          </div>
        </section>

        {/* Developer Mode Toggle */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <Wrench size={14} /> Developer
          </h2>
          <div className="p-4 bg-surface-1 border border-border-muted rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Developer Mode</div>
                <div className="text-2xs text-text-muted mt-0.5">
                  Unlock grid service configuration and debug features
                </div>
              </div>
              <Toggle on={developerMode} onToggle={() => setDeveloperMode(!developerMode)} />
            </div>
          </div>
        </section>

        {/* Grid Services (developer only) */}
        {developerMode && (
          <section className="space-y-3 animate-fade-in">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Server size={14} /> Grid Services
            </h2>

            {/* Preset buttons */}
            <div className="flex gap-2">
              {PRESETS.map(({ key, label, desc, Icon }) => (
                <button
                  key={key}
                  onClick={() => setEnvironment(key)}
                  className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                    current === key
                      ? 'bg-shell-500/5 border-shell-500/30 text-text-primary'
                      : 'bg-surface-1 border-border-muted text-text-muted hover:border-border'
                  }`}
                >
                  <Icon size={14} className="flex-shrink-0" />
                  <div className="text-left">
                    <div className="text-xs font-semibold">{label}</div>
                    <div className="text-2xs opacity-70">{desc}</div>
                  </div>
                  {current === key && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-shell-400" />
                  )}
                </button>
              ))}
            </div>

            {/* Per-service URL fields */}
            <div className="bg-surface-1 border border-border-muted rounded-xl divide-y divide-border-muted">
              {(Object.keys(SERVICE_LABELS) as (keyof ServiceEndpoints)[]).map((service) => {
                const { label, description } = SERVICE_LABELS[service];
                return (
                  <div key={service} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-text-primary">{label}</span>
                      <span className="text-2xs text-text-muted">{description}</span>
                    </div>
                    <input
                      type="url"
                      value={endpoints[service]}
                      onChange={(e) => setEndpoint(service, e.target.value)}
                      placeholder={`https://...`}
                      className="w-full bg-surface-2 border border-border-muted rounded-lg px-3 py-1.5 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50 transition-colors"
                    />
                  </div>
                );
              })}
            </div>

            {current === 'custom' && (
              <p className="text-2xs text-text-muted pl-1">
                Custom — individual service URLs override the preset.
              </p>
            )}
          </section>
        )}


        {/* Voice */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <Volume2 size={14} /> Voice
          </h2>
          {useCosmosLogosStore.getState().agents.some(a => a.capabilities.includes('x-tts')) ? (
            <div className="p-4 bg-surface-1 border border-border-muted rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Talk Mode</div>
                  <div className="text-2xs text-text-muted mt-0.5">
                    Microphone listens and auto-sends after you speak
                  </div>
                </div>
                <Toggle on={ttsTalkMode} onToggle={() => setTTSTalkMode(!ttsTalkMode)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Auto-Play Audio</div>
                  <div className="text-2xs text-text-muted mt-0.5">
                    Automatically speak AI responses aloud
                  </div>
                </div>
                <Toggle on={ttsAutoPlay} onToggle={() => setTTSAutoPlay(!ttsAutoPlay)} />
              </div>
            </div>
          ) : (
            <div className="p-4 bg-surface-1 border border-border-muted rounded-xl">
              <p className="text-2xs text-text-muted">
                Connect a TTS agent (like Apollo) via Agent Setup to enable voice features.
              </p>
            </div>
          )}
        </section>

        {/* Memory */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <Brain size={14} /> Memory
          </h2>
          <div className="p-4 bg-surface-1 border border-border-muted rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Memory</div>
                <div className="text-2xs text-text-muted mt-0.5">
                  Remember conversation context within a session
                </div>
              </div>
              <Toggle on={memoryEnabled} onToggle={() => setMemoryEnabled(!memoryEnabled)} />
            </div>
            {!memoryEnabled && (
              <div className="mt-3 text-2xs text-yellow-400/80 bg-yellow-500/5 border border-yellow-500/10 rounded-lg px-3 py-2">
                Memory is disabled. Conversations are fully stateless.
              </div>
            )}
          </div>
        </section>

        {/* About */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <Info size={14} /> About
          </h2>
          <div className="p-4 bg-surface-1 border border-border-muted rounded-xl space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Version</span>
              <span className="font-mono text-text-secondary">1.7.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Platform</span>
              <span className="text-text-secondary">Web</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">License</span>
              <span className="text-text-secondary">AGPL-3.0</span>
            </div>
            <div className="pt-2 border-t border-border-muted text-2xs text-text-muted">
              &copy; 2026 CloudPremise LLC. All rights reserved.
            </div>
          </div>
        </section>

        {/* Legal Links */}
        <section className="flex items-center gap-4 text-xs text-text-muted">
          <a href="/terms" className="hover:text-text-secondary transition-colors">
            Terms &amp; Conditions
          </a>
          <span>·</span>
          <a href="/privacy" className="hover:text-text-secondary transition-colors">
            Privacy Policy
          </a>
          <span>·</span>
          <a href="/security" className="hover:text-text-secondary transition-colors">
            Security
          </a>
        </section>
      </div>
    </div>
  );
}
