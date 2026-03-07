import { useState, useCallback, useRef, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Loader2, X, ChevronDown, ChevronRight, Copy, Check, Eye, EyeOff } from 'lucide-react';
import {
  startDeviceFlow,
  pollForToken,
  validateAndStoreToken,
  getGitHubClientId,
  type GitHubUser,
  type DeviceFlowStart,
} from '@/lib/api/github-client';
import { useServiceStore } from '@/lib/store/service-store';
import { useEnvironmentStore } from '@/lib/store/environment-store';

type Tab = 'device' | 'pat';
type DeviceState = 'idle' | 'pending' | 'success' | 'error';

interface GitHubConnectProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GitHubConnect({ open, onOpenChange }: GitHubConnectProps) {
  const [tab, setTab] = useState<Tab>('device');
  const [deviceState, setDeviceState] = useState<DeviceState>('idle');
  const [deviceFlow, setDeviceFlow] = useState<DeviceFlowStart | null>(null);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [devExpanded, setDevExpanded] = useState(false);

  // PAT tab
  const [pat, setPat] = useState('');
  const [showPat, setShowPat] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const developerMode = useEnvironmentStore((s) => s.developerMode);

  const cleanup = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const resetState = useCallback(() => {
    cleanup();
    setTimeout(() => {
      setTab('device');
      setDeviceState('idle');
      setDeviceFlow(null);
      setUser(null);
      setError('');
      setLoading(false);
      setCodeCopied(false);
      setTimeLeft(0);
      setDevExpanded(false);
      setPat('');
      setShowPat(false);
    }, 200);
  }, [cleanup]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
      if (!nextOpen) resetState();
    },
    [onOpenChange, resetState],
  );

  // Countdown timer for device flow
  useEffect(() => {
    if (deviceState !== 'pending' || !deviceFlow) return;
    setTimeLeft(deviceFlow.expiresIn);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [deviceState, deviceFlow]);

  // ── Device Flow ────────────────────────────────────

  const handleStartDeviceFlow = async () => {
    setError('');
    setLoading(true);
    try {
      const flow = await startDeviceFlow();
      setDeviceFlow(flow);
      setDeviceState('pending');

      // Start polling in background
      const controller = new AbortController();
      abortRef.current = controller;

      pollForToken(flow.deviceCode, flow.expiresIn, flow.interval, controller.signal)
        .then((ghUser) => {
          setUser(ghUser);
          setDeviceState('success');
          useServiceStore.getState().setGitHubConnected(ghUser.login);
          setTimeout(() => handleOpenChange(false), 1500);
        })
        .catch((err) => {
          if ((err as Error).message === 'gh_device_cancelled') return;
          setError(friendlyError((err as Error).message));
          setDeviceState('error');
        });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start device flow');
      setDeviceState('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDeviceFlow = () => {
    cleanup();
    setDeviceState('idle');
    setDeviceFlow(null);
    setError('');
  };

  // ── PAT Flow ───────────────────────────────────────

  const handlePatConnect = async () => {
    setError('');
    setLoading(true);
    try {
      const ghUser = await validateAndStoreToken(pat.trim());
      setUser(ghUser);
      useServiceStore.getState().setGitHubConnected(ghUser.login);
      setDeviceState('success');
      setTimeout(() => handleOpenChange(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Token validation failed');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (deviceFlow?.userCode) {
      navigator.clipboard.writeText(deviceFlow.userCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-surface-1 border border-border-muted rounded-2xl p-6 z-50 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-semibold">
              Connect GitHub
            </Dialog.Title>
            <Dialog.Close className="p-1.5 rounded-md hover:bg-surface-3 text-text-muted transition-colors">
              <X size={18} />
            </Dialog.Close>
          </div>

          {/* Success state — shared */}
          {deviceState === 'success' && user && (
            <div className="text-center py-6 space-y-3">
              {user.avatarUrl && (
                <img src={user.avatarUrl} alt={user.login} className="w-16 h-16 rounded-full mx-auto border-2 border-shell-400/30" />
              )}
              <p className="text-sm font-medium text-text-primary">Connected as {user.login}</p>
              <p className="text-2xs text-text-muted">{user.name}</p>
            </div>
          )}

          {/* Normal flow */}
          {deviceState !== 'success' && (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Tabs */}
              <div className="flex border-b border-border-muted mb-4">
                <button
                  onClick={() => { setTab('device'); setError(''); }}
                  className={`flex-1 pb-2 text-xs font-medium border-b-2 transition-colors ${
                    tab === 'device'
                      ? 'border-shell-400 text-shell-400'
                      : 'border-transparent text-text-muted hover:text-text-secondary'
                  }`}
                >
                  Device Flow
                </button>
                <button
                  onClick={() => { setTab('pat'); setError(''); }}
                  className={`flex-1 pb-2 text-xs font-medium border-b-2 transition-colors ${
                    tab === 'pat'
                      ? 'border-shell-400 text-shell-400'
                      : 'border-transparent text-text-muted hover:text-text-secondary'
                  }`}
                >
                  Personal Access Token
                </button>
              </div>

              {/* Device Flow Tab */}
              {tab === 'device' && (
                <div className="space-y-4">
                  {deviceState === 'idle' && (
                    <>
                      <p className="text-sm text-text-secondary">
                        Authorize TurtleShell.ai to access GitHub without managing a token.
                      </p>
                      <div className="text-2xs text-text-muted">
                        Required scopes: <code className="text-text-secondary">repo</code>{' '}
                        <code className="text-text-secondary">read:user</code>{' '}
                        <code className="text-text-secondary">read:org</code>
                      </div>
                      <button
                        onClick={handleStartDeviceFlow}
                        disabled={loading || !getGitHubClientId()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-shell-500 text-white text-sm font-medium rounded-lg hover:bg-shell-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                        Connect with GitHub
                      </button>
                      {!getGitHubClientId() && (
                        <p className="text-2xs text-red-400">VITE_GH_CLIENT_ID is not configured.</p>
                      )}
                    </>
                  )}

                  {deviceState === 'pending' && deviceFlow && (
                    <>
                      <p className="text-sm text-text-secondary">
                        Enter this code at GitHub:
                      </p>

                      {/* User code */}
                      <button
                        onClick={copyCode}
                        className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-surface-2 border border-border-muted rounded-xl hover:border-shell-400/30 transition-colors group"
                      >
                        <span className="text-2xl font-mono font-bold tracking-[0.3em] text-text-primary">
                          {deviceFlow.userCode}
                        </span>
                        {codeCopied
                          ? <Check size={16} className="text-shell-400" />
                          : <Copy size={16} className="text-text-muted group-hover:text-text-secondary" />
                        }
                      </button>

                      {/* Verification link */}
                      <a
                        href={deviceFlow.verificationUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center text-sm text-shell-400 hover:underline"
                      >
                        {deviceFlow.verificationUri}
                      </a>

                      {/* Status */}
                      <div className="flex items-center justify-between text-2xs text-text-muted">
                        <span className="flex items-center gap-1.5">
                          <Loader2 size={10} className="animate-spin" />
                          Waiting for authorization...
                        </span>
                        {timeLeft > 0 && <span>Expires in {formatTime(timeLeft)}</span>}
                      </div>

                      <button
                        onClick={handleCancelDeviceFlow}
                        className="w-full text-xs text-text-muted hover:text-text-secondary transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {deviceState === 'error' && (
                    <button
                      onClick={() => { setDeviceState('idle'); setError(''); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-shell-500 text-white text-sm font-medium rounded-lg hover:bg-shell-400 transition-colors"
                    >
                      Try Again
                    </button>
                  )}
                </div>
              )}

              {/* PAT Tab */}
              {tab === 'pat' && (
                <div className="space-y-4">
                  <p className="text-sm text-text-secondary">
                    Paste a GitHub Personal Access Token with{' '}
                    <code className="text-text-primary text-xs">repo</code>,{' '}
                    <code className="text-text-primary text-xs">read:user</code>,{' '}
                    <code className="text-text-primary text-xs">read:org</code> scopes.
                  </p>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo,read:user,read:org&description=TurtleShell"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs text-shell-400 hover:underline"
                  >
                    Generate token at github.com/settings/tokens
                  </a>
                  <div className="relative">
                    <input
                      type={showPat ? 'text' : 'password'}
                      value={pat}
                      onChange={(e) => setPat(e.target.value)}
                      placeholder="ghp_..."
                      className="w-full px-3 py-2.5 pr-10 bg-surface-2 border border-border-muted rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-400 transition-colors font-mono"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && pat.trim() && !loading) handlePatConnect();
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPat(!showPat)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-secondary transition-colors"
                    >
                      {showPat ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button
                    onClick={handlePatConnect}
                    disabled={!pat.trim() || loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-shell-500 text-white text-sm font-medium rounded-lg hover:bg-shell-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                    Connect
                  </button>
                </div>
              )}

              {/* Developer mode */}
              {developerMode && (
                <div className="mt-4 border border-border-muted rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setDevExpanded(!devExpanded)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-muted hover:bg-surface-2 transition-colors"
                  >
                    {devExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    Developer Info
                  </button>
                  {devExpanded && (
                    <div className="px-3 pb-3 space-y-2">
                      <div>
                        <label className="text-2xs text-text-muted block mb-1">Client ID</label>
                        <input
                          type="text"
                          readOnly
                          value={getGitHubClientId() || '(not set)'}
                          className="w-full px-2.5 py-1.5 bg-surface-2 border border-border-muted rounded text-2xs text-text-muted font-mono select-all"
                        />
                      </div>
                      <div>
                        <label className="text-2xs text-text-muted block mb-1">Poseidon header</label>
                        <input
                          type="text"
                          readOnly
                          value="x-github-token"
                          className="w-full px-2.5 py-1.5 bg-surface-2 border border-border-muted rounded text-2xs text-text-muted font-mono select-all"
                        />
                      </div>
                      <p className="text-2xs text-text-muted leading-relaxed">
                        Device Flow — no client_secret in browser. Check console for [GH] logs.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function friendlyError(msg: string): string {
  switch (msg) {
    case 'gh_device_expired': return 'Authorization code expired. Please try again.';
    case 'gh_device_denied': return 'Authorization was denied on GitHub.';
    case 'gh_device_timeout': return 'Authorization timed out. Please try again.';
    case 'gh_device_cancelled': return 'Authorization cancelled.';
    default: return msg;
  }
}
