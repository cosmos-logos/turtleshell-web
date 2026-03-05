import { useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Loader2, X, ChevronDown, ChevronRight, Eye, EyeOff, Check } from 'lucide-react';
import { validateAndStoreToken, type HubSpotAccount } from '@/lib/api/hubspot-client';
import { useServiceStore } from '@/lib/store/service-store';
import { useEnvironmentStore } from '@/lib/store/environment-store';

interface HubSpotConnectProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HubSpotConnect({ open, onOpenChange }: HubSpotConnectProps) {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [account, setAccount] = useState<HubSpotAccount | null>(null);
  const [success, setSuccess] = useState(false);
  const [devExpanded, setDevExpanded] = useState(false);

  const developerMode = useEnvironmentStore((s) => s.developerMode);

  const resetState = useCallback(() => {
    setTimeout(() => {
      setToken('');
      setShowToken(false);
      setLoading(false);
      setError('');
      setAccount(null);
      setSuccess(false);
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
      const acct = await validateAndStoreToken(token.trim());
      setAccount(acct);
      setSuccess(true);
      useServiceStore.getState().setHubSpotConnected(acct.portalId);
      setTimeout(() => handleOpenChange(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Token validation failed');
    } finally {
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
              Connect HubSpot
            </Dialog.Title>
            <Dialog.Close className="p-1.5 rounded-md hover:bg-surface-3 text-text-muted transition-colors">
              <X size={18} />
            </Dialog.Close>
          </div>

          {/* Success */}
          {success && account && (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 rounded-full mx-auto bg-shell-500/10 flex items-center justify-center">
                <Check size={32} className="text-shell-400" />
              </div>
              <p className="text-sm font-medium text-text-primary">Connected to HubSpot</p>
              <p className="text-2xs text-text-muted">Portal {account.portalId}</p>
            </div>
          )}

          {/* Connect form */}
          {!success && (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <p className="text-sm text-text-secondary">
                  Paste a HubSpot Private App access token. Create one at{' '}
                  <a
                    href="https://app.hubspot.com/private-apps/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-shell-400 hover:underline"
                  >
                    app.hubspot.com/private-apps
                  </a>
                </p>

                <div className="text-2xs text-text-muted">
                  Required scopes:{' '}
                  <code className="text-text-secondary">crm.objects.contacts.read</code>{' '}
                  <code className="text-text-secondary">crm.objects.contacts.write</code>{' '}
                  <code className="text-text-secondary">crm.objects.companies.read</code>{' '}
                  <code className="text-text-secondary">crm.objects.deals.read</code>
                </div>

                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="pat-na1-..."
                    className="w-full px-3 py-2.5 pr-10 bg-surface-2 border border-border-muted rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-400 transition-colors font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && token.trim() && !loading) handleConnect();
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-secondary transition-colors"
                  >
                    {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                <button
                  onClick={handleConnect}
                  disabled={!token.trim() || loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-shell-500 text-white text-sm font-medium rounded-lg hover:bg-shell-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Connect
                </button>
              </div>

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
                        <label className="text-2xs text-text-muted block mb-1">Poseidon header</label>
                        <input
                          type="text"
                          readOnly
                          value="x-hubspot-api-key"
                          className="w-full px-2.5 py-1.5 bg-surface-2 border border-border-muted rounded text-2xs text-text-muted font-mono select-all"
                        />
                      </div>
                      <div>
                        <label className="text-2xs text-text-muted block mb-1">API Base URL</label>
                        <input
                          type="text"
                          readOnly
                          value="https://api.hubapi.com"
                          className="w-full px-2.5 py-1.5 bg-surface-2 border border-border-muted rounded text-2xs text-text-muted font-mono select-all"
                        />
                      </div>
                      <p className="text-2xs text-text-muted leading-relaxed">
                        Private App token — static Bearer auth (no OAuth). Check console for [HS] logs.
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
