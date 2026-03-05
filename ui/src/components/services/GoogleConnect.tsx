import { useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Loader2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { getGoogleLoginUrl, getGoogleClientId } from '@/lib/api/google-client';
import { useEnvironmentStore } from '@/lib/store/environment-store';

interface GoogleConnectProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GOOGLE_CALLBACK_URL = `${window.location.origin}/oauth/callback/google`;

export function GoogleConnect({ open, onOpenChange }: GoogleConnectProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devExpanded, setDevExpanded] = useState(false);

  const developerMode = useEnvironmentStore((s) => s.developerMode);

  const resetState = useCallback(() => {
    setTimeout(() => {
      setLoading(false);
      setError('');
      setDevExpanded(false);
    }, 200);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
      if (!nextOpen) resetState();
    },
    [onOpenChange, resetState],
  );

  const handleConnect = async () => {
    setError('');
    setLoading(true);
    try {
      const url = await getGoogleLoginUrl();
      console.log('[GOOGLE] Redirecting to Google login...');
      window.location.href = url;
    } catch (e) {
      console.error('[GOOGLE] Login URL generation failed:', e);
      setError(e instanceof Error ? e.message : 'Failed to start OAuth flow');
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-surface-1 border border-border-muted rounded-2xl p-6 z-50 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-semibold">
              Connect Google
            </Dialog.Title>
            <Dialog.Close className="p-1.5 rounded-md hover:bg-surface-3 text-text-muted transition-colors">
              <X size={18} />
            </Dialog.Close>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Connect your Google account to enable Calendar, Gmail, and Drive tools through Poseidon MCP.
            </p>

            <div className="text-2xs text-text-muted">
              Requested scopes: <code className="text-text-secondary">email</code>{' '}
              <code className="text-text-secondary">profile</code>{' '}
              <code className="text-text-secondary">calendar.readonly</code>{' '}
              <code className="text-text-secondary">gmail.readonly</code>{' '}
              <code className="text-text-secondary">drive.readonly</code>
            </div>

            {/* Developer mode info */}
            {developerMode && (
              <div className="border border-border-muted rounded-lg overflow-hidden">
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
                        value={getGoogleClientId()}
                        className="w-full px-2.5 py-1.5 bg-surface-2 border border-border-muted rounded text-2xs text-text-muted font-mono select-all"
                      />
                    </div>
                    <div>
                      <label className="text-2xs text-text-muted block mb-1">Callback URL</label>
                      <input
                        type="text"
                        readOnly
                        value={GOOGLE_CALLBACK_URL}
                        className="w-full px-2.5 py-1.5 bg-surface-2 border border-border-muted rounded text-2xs text-text-muted font-mono select-all"
                      />
                    </div>
                    <div>
                      <label className="text-2xs text-text-muted block mb-1">Poseidon header</label>
                      <input
                        type="text"
                        readOnly
                        value="x-google-token"
                        className="w-full px-2.5 py-1.5 bg-surface-2 border border-border-muted rounded text-2xs text-text-muted font-mono select-all"
                      />
                    </div>
                    <p className="text-2xs text-text-muted leading-relaxed">
                      PKCE flow — no client_secret in browser. Check console for [GOOGLE] logs.
                    </p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={loading || !getGoogleClientId()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-shell-500 text-white text-sm font-medium rounded-lg hover:bg-shell-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              Connect with Google
            </button>
            {!getGoogleClientId() && (
              <p className="text-2xs text-red-400">VITE_GOOGLE_CLIENT_ID is not configured.</p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
