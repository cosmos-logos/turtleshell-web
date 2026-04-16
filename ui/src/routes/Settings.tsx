import { Info, Sun, Moon, Brain, Wrench } from 'lucide-react';
import { useEnvironmentStore } from '@/lib/store/environment-store';
import { useChatStore } from '@/lib/store/chat-store';
import { useThemeStore } from '@/lib/store/theme-store';
import { useAgentThemeStore, type AgentTheme } from '@/lib/store/agent-theme-store';
import { useChatPreferencesStore } from '@/lib/store/chat-preferences-store';

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

const AGENT_THEMES: { value: AgentTheme; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'olympus', label: 'Olympus' },
];

function AgentThemeSelector() {
  const { agentTheme, setAgentTheme } = useAgentThemeStore();
  return (
    <div className="pt-3 border-t border-border-muted">
      <div className="text-sm font-semibold mb-1">Agent Theme</div>
      <div className="text-2xs text-text-muted mb-3">Controls agent avatars in chat, sidebar, and picker</div>
      <div className="flex gap-1 bg-surface-2 p-1 rounded-lg">
        {AGENT_THEMES.map(t => (
          <button
            key={t.value}
            onClick={() => setAgentTheme(t.value)}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
              agentTheme === t.value
                ? 'bg-shell-500 text-white shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Settings — minimal MVP surface. Three top-level toggles ordered
 * Appearance → Memory → Developer. Everything else (beta features,
 * agent avatars, agent theme, future dev tools) lives *inside* the
 * Developer section, revealed only when Developer Mode is ON. The
 * Developer Mode toggle itself stays at the top of that panel so it
 * never vanishes when the rest expands.
 */
export function Settings() {
  const { developerMode, setDeveloperMode, testBetaEnabled, setTestBetaEnabled } = useEnvironmentStore();

  const { theme, setTheme } = useThemeStore();
  const { memoryEnabled, setMemoryEnabled } = useChatStore();
  const { showAgentAvatars, setShowAgentAvatars } = useChatPreferencesStore();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-text-muted mt-1">
            Configure your TurtleShell.ai experience.
          </p>
        </div>

        {/* Appearance — Dark Mode toggle only. First visible knob. */}
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

        {/* Memory — second top-level knob. */}
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

        {/* Developer — last top-level section. The Developer Mode toggle
            is the anchor at the top of this panel. When it's ON, every
            other advanced knob (Test Beta, Agent Avatars, Agent Theme,
            future dev tools) reveals *below* the toggle, never above. */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <Wrench size={14} /> Developer
          </h2>
          <div className="p-4 bg-surface-1 border border-border-muted rounded-xl space-y-4">
            {/* Toggle stays pinned at the top of the panel. */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">Developer Mode</div>
                <div className="text-2xs text-text-muted mt-0.5">
                  Debug info and developer tools.
                </div>
              </div>
              <Toggle on={developerMode} onToggle={() => setDeveloperMode(!developerMode)} />
            </div>

            {developerMode && (
              <>
                {/* Test Beta Features — early-access advanced UI. */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-border-muted">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">Test Beta Features</div>
                    <div className="text-2xs text-text-muted mt-0.5">
                      Show the full UI.
                    </div>
                  </div>
                  <Toggle on={testBetaEnabled} onToggle={() => setTestBetaEnabled(!testBetaEnabled)} />
                </div>

                {/* Agent Avatars — controls chat + sidebar avatar rendering.
                    Previously lived in its own "Chat" section; moved here
                    because it's a power-user knob that only makes sense
                    once Developer Mode reveals the theme system. */}
                <div className="pt-3 border-t border-border-muted">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Agent Avatars</div>
                      <div className="text-2xs text-text-muted mt-0.5">
                        Show agent emoji next to messages in chat
                      </div>
                    </div>
                    <Toggle on={showAgentAvatars} onToggle={() => setShowAgentAvatars(!showAgentAvatars)} />
                  </div>
                  {showAgentAvatars && <AgentThemeSelector />}
                </div>
              </>
            )}
          </div>
        </section>

        {/* About — version, platform, license inline (never hidden). */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <Info size={14} /> About
          </h2>
          <div className="p-4 bg-surface-1 border border-border-muted rounded-xl space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Version</span>
              <span className="font-mono text-text-secondary">1.7.4</span>
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
