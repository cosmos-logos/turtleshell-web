import { useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Loader2, X, ChevronDown, ChevronRight, Eye, EyeOff, Check } from 'lucide-react';
import { testConnection, type WorkdayAccount } from '@/lib/api/workday-client';
import { useServiceStore } from '@/lib/store/service-store';
import { useEnvironmentStore } from '@/lib/store/environment-store';

type Tab = 'basic' | 'oauth';

interface WorkdayConnectProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkdayConnect({ open, onOpenChange }: WorkdayConnectProps) {
  const [tab, setTab] = useState<Tab>('basic');
  // DEBUG defaults from iOS WorkdayServiceSetupView.swift — remove before production
  const [endpoint, setEndpoint] = useState('https://wd2-impl-services1.workday.com/ccx/service/procasemanagement/Revenue_Management/v44.1');
  const [username, setUsername] = useState('ISU_INT_Salesforce_Customers@procasemanagement');
  const [password, setPassword] = useState('t8#UEWYv**n^b3');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [account, setAccount] = useState<WorkdayAccount | null>(null);
  const [success, setSuccess] = useState(false);
  const [devExpanded, setDevExpanded] = useState(false);

  const developerMode = useEnvironmentStore((s) => s.developerMode);

  const resetState = useCallback(() => {
    setTimeout(() => {
      setTab('basic');
      setEndpoint('https://wd2-impl-services1.workday.com/ccx/service/procasemanagement/Revenue_Management/v44.1');
      setUsername('ISU_INT_Salesforce_Customers@procasemanagement');
      setPassword('t8#UEWYv**n^b3');
      setShowPassword(false);
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
      const acct = await testConnection(endpoint.trim(), username.trim(), password);
      setAccount(acct);
      setSuccess(true);
      useServiceStore.getState().setWorkdayConnected(acct.endpoint, acct.tenant);
      setTimeout(() => handleOpenChange(false), 1500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Connection failed';
      if (msg === 'wd_auth_failed') {
        setError('Invalid credentials — check username and password');
      } else if (msg === 'wd_connection_failed') {
        setError('Could not reach Workday — check the tenant URL');
      } else {
        setError(msg);
      }
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
              Connect Workday
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
              <p className="text-sm font-medium text-text-primary">Connected to Workday</p>
              <p className="text-2xs text-text-muted">Tenant: {account.tenant}</p>
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

              {/* Tabs */}
              <div className="flex border-b border-border-muted mb-4">
                <button
                  onClick={() => { setTab('basic'); setError(''); }}
                  className={`flex-1 pb-2 text-xs font-medium border-b-2 transition-colors ${
                    tab === 'basic'
                      ? 'border-shell-400 text-shell-400'
                      : 'border-transparent text-text-muted hover:text-text-secondary'
                  }`}
                >
                  Basic Auth
                </button>
                <button
                  disabled
                  className="flex-1 pb-2 text-xs font-medium border-b-2 border-transparent text-text-muted/50 cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  OAuth 2.0
                  <span className="text-2xs font-medium px-1.5 py-0.5 bg-surface-3 text-text-muted rounded-full">
                    Soon
                  </span>
                </button>
              </div>

              {/* Basic Auth Tab */}
              {tab === 'basic' && (
                <div className="space-y-3">
                  <p className="text-sm text-text-secondary">
                    Enter your Workday tenant URL and credentials.
                  </p>

                  {/* Endpoint URL */}
                  <div>
                    <label className="text-2xs text-text-muted block mb-1">Endpoint URL</label>
                    <input
                      type="text"
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                      placeholder="https://wd2-impl-services1.workday.com/ccx/service/tenant/"
                      className="w-full px-3 py-2.5 bg-surface-2 border border-border-muted rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-400 transition-colors font-mono text-2xs"
                    />
                    <p className="text-2xs text-text-muted mt-1">Your Workday SOAP or REST endpoint</p>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="text-2xs text-text-muted block mb-1">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="ISU_username"
                      className="w-full px-3 py-2.5 bg-surface-2 border border-border-muted rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-400 transition-colors"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-2xs text-text-muted block mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2.5 pr-10 bg-surface-2 border border-border-muted rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-400 transition-colors"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && endpoint.trim() && username.trim() && password && !loading) {
                            handleConnect();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-secondary transition-colors"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleConnect}
                    disabled={!endpoint.trim() || !username.trim() || !password || loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-shell-500 text-white text-sm font-medium rounded-lg hover:bg-shell-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                    {loading ? 'Testing connection...' : 'Test & Connect'}
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
                        <label className="text-2xs text-text-muted block mb-1">Poseidon headers</label>
                        <div className="space-y-1">
                          {['x-workday-user', 'x-workday-password', 'x-workday-endpoint'].map((h) => (
                            <input
                              key={h}
                              type="text"
                              readOnly
                              value={h}
                              className="w-full px-2.5 py-1 bg-surface-2 border border-border-muted rounded text-2xs text-text-muted font-mono select-all"
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-2xs text-text-muted block mb-1">Auth method</label>
                        <input
                          type="text"
                          readOnly
                          value="Basic (Base64 username:password)"
                          className="w-full px-2.5 py-1.5 bg-surface-2 border border-border-muted rounded text-2xs text-text-muted font-mono select-all"
                        />
                      </div>
                      <p className="text-2xs text-text-muted leading-relaxed">
                        Prototype integration — connectivity test via GET to endpoint. Check console for [WD] logs.
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
