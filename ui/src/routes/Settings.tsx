import { Cloud, House, Settings as SettingsIcon, Wrench, Info } from 'lucide-react';
import {
  useEnvironmentStore,
} from '@/lib/store/environment-store';

export function Settings() {
  const {
    current,
    customEndpoint,
    developerMode,
    setEnvironment,
    setCustomEndpoint,
    setDeveloperMode,
  } = useEnvironmentStore();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-text-muted mt-1">
            Configure your TurtleShell.ai experience.
          </p>
        </div>

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
                  Unlock environment picker and debug features
                </div>
              </div>
              <button
                onClick={() => setDeveloperMode(!developerMode)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  developerMode ? 'bg-shell-500' : 'bg-surface-3'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                    developerMode ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Environment Selection (developer only) */}
        {developerMode && (
          <section className="space-y-3 animate-fade-in">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Cloud size={14} /> Environment
            </h2>
            <div className="space-y-2">
              {(
                [
                  {
                    key: 'cloud',
                    label: 'Running in Cloud',
                    desc: 'AWS Olympus-Grid',
                    Icon: Cloud,
                  },
                  {
                    key: 'offgrid',
                    label: 'Running Off-Grid',
                    desc: 'ngrok tunnel',
                    Icon: House,
                  },
                  {
                    key: 'custom',
                    label: 'Custom',
                    desc: 'User-defined endpoint',
                    Icon: SettingsIcon,
                  },
                ] as const
              ).map(({ key, label, desc, Icon }) => (
                <button
                  key={key}
                  onClick={() => setEnvironment(key)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    current === key
                      ? 'bg-shell-500/5 border-shell-500/30'
                      : 'bg-surface-1 border-border-muted hover:border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className="text-text-secondary flex-shrink-0" />
                    <div>
                      <div className="text-sm font-semibold">{label}</div>
                      <div className="text-2xs text-text-muted">{desc}</div>
                    </div>
                    {current === key && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-shell-400" />
                    )}
                  </div>
                </button>
              ))}

              {current === 'custom' && (
                <div className="p-4 bg-surface-1 border border-border-muted rounded-xl animate-fade-in">
                  <label className="text-2xs font-medium text-text-muted block mb-2">
                    Custom Endpoint URL
                  </label>
                  <input
                    type="url"
                    value={customEndpoint}
                    onChange={(e) => setCustomEndpoint(e.target.value)}
                    placeholder="https://your-endpoint.example.com"
                    className="w-full bg-surface-3 border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50"
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* About */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <Info size={14} /> About
          </h2>
          <div className="p-4 bg-surface-1 border border-border-muted rounded-xl space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Version</span>
              <span className="font-mono text-text-secondary">0.1.0</span>
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
