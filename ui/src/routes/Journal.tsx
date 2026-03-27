import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Settings, X, Loader2, CheckCircle } from 'lucide-react';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import { ThothClient } from '@/lib/agents/thoth';

export function Journal() {
  const { agents } = useCosmosLogosStore();
  const thoth = agents.find((a) => a.capabilities.includes('journal'));

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [repoPath, setRepoPath] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  // Load current settings when panel opens
  useEffect(() => {
    if (!settingsOpen || !thoth) return;
    const client = new ThothClient(thoth.url, thoth.manifest);
    client.getSettings().then((s) => {
      setRepoPath(s.repo_path || '');
      setDefaultBranch(s.default_branch || 'main');
    }).catch(() => {});
  }, [settingsOpen, thoth]);

  if (!thoth) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-8 px-4">
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <AlertCircle size={32} className="text-text-muted" />
            <h2 className="text-lg font-semibold">Journal Not Available</h2>
            <p className="text-sm text-text-muted max-w-sm">
              Connect the Thoth writing agent to unlock the Journal. Go to Agent Setup and enter the
              Thoth URL.
            </p>
            <Link to="/app/agents" className="text-sm text-shell-400 hover:underline">
              Go to Agent Setup
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!repoPath.trim()) return;
    setSaving(true);
    setSaveError('');
    setSaved(false);
    try {
      const client = new ThothClient(thoth.url, thoth.manifest);
      await client.updateSettings({
        repo_path: repoPath.trim(),
        default_branch: defaultBranch.trim() || 'main',
      });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setSettingsOpen(false);
      }, 1500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const journalUrl = `${thoth.url}/static/journal.html`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Settings toggle button */}
      <button
        onClick={() => setSettingsOpen((v) => !v)}
        className="absolute top-3 right-3 z-20 p-1.5 rounded-md bg-surface-2 hover:bg-surface-3 text-text-muted hover:text-text-secondary transition-colors border border-border-muted"
        title="Journal settings"
      >
        <Settings size={14} />
      </button>

      {/* Settings panel */}
      {settingsOpen && (
        <div className="absolute top-0 right-0 z-30 w-80 bg-surface-1 border-l border-b border-border-muted rounded-bl-xl shadow-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Journal Settings</span>
            <button
              onClick={() => setSettingsOpen(false)}
              className="p-1 rounded-md hover:bg-surface-2 text-text-muted transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-2xs text-text-muted block mb-1">
                Repo path <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={repoPath}
                onChange={(e) => setRepoPath(e.target.value)}
                placeholder="/Users/you/Documents/journal"
                className="w-full bg-surface-2 border border-border-muted rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50 transition-colors font-mono"
              />
              <p className="text-2xs text-text-muted mt-1">
                Local directory where entries are stored as git commits.
              </p>
            </div>
            <div>
              <label className="text-2xs text-text-muted block mb-1">Default branch</label>
              <input
                type="text"
                value={defaultBranch}
                onChange={(e) => setDefaultBranch(e.target.value)}
                placeholder="main"
                className="w-full bg-surface-2 border border-border-muted rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50 transition-colors font-mono"
              />
            </div>
          </div>

          {saveError && (
            <div className="flex items-start gap-2 p-2 bg-red-500/5 border border-red-500/20 rounded-lg text-2xs text-red-400">
              <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          {saved && (
            <div className="flex items-center gap-2 p-2 bg-green-500/5 border border-green-500/20 rounded-lg text-2xs text-green-400">
              <CheckCircle size={12} />
              <span>Settings saved.</span>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !repoPath.trim()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-shell-500/10 text-shell-400 hover:bg-shell-500/20 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : null}
            Save
          </button>
        </div>
      )}

      <iframe
        src={journalUrl}
        className="flex-1 w-full border-none"
        title="Thoth Journal"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
