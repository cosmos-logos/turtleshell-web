import { Info, Volume2, Sun, Moon, Brain, Wrench } from 'lucide-react';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import { useEnvironmentStore } from '@/lib/store/environment-store';
import { useApolloStore } from '@/lib/store/apollo-store';
import { useChatStore } from '@/lib/store/chat-store';
import { useThemeStore } from '@/lib/store/theme-store';

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
  const { developerMode, setDeveloperMode } = useEnvironmentStore();

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
                  Show debug info and developer tools in the console
                </div>
              </div>
              <Toggle on={developerMode} onToggle={() => setDeveloperMode(!developerMode)} />
            </div>
          </div>
        </section>

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
              <span className="font-mono text-text-secondary">1.7.1</span>
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
