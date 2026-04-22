// routes/tools/GoogleToolWizard.tsx
//
// Google Workspace tool wizard. Mirrors SalesforceToolWizard but
// without the org-URL picker — Google has one sign-in endpoint
// (accounts.google.com) regardless of which Workspace domain the
// user belongs to.
//
// Copy is written for the same audience as the Salesforce wizard:
// a user who knows what Google Drive is, not what OAuth 2.0 is.

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Loader2, ShieldCheck, AlertTriangle, Copy, Check, ExternalLink } from 'lucide-react';
import { useChatStore } from '@/lib/store/chat-store';
import { getManifestForAgentId } from '@/manifests';
import type { TrustedToolServer } from '@/lib/cosmos-logos/types';
import {
  startGoogleToolOAuth,
  type GoogleToolContext,
} from '@/lib/tools/google-tool-oauth';

type Step = 'promise' | 'configure' | 'connecting';

export function GoogleToolWizard() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const activeAgentId = useChatStore((s) => s.activeAgentId);

  const [step, setStep] = useState<Step>('promise');
  const [clientId, setClientId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const manifest = getManifestForAgentId(activeAgentId);
  const agentDisplayName = manifest?.identity?.name ?? activeAgentId;

  const tool: TrustedToolServer | undefined = useMemo(() => {
    const codename = params.get('codename');
    if (!codename) return undefined;
    return manifest?.trusted_tool_servers?.find((t) => t.codename === codename);
  }, [params, manifest]);

  if (!tool) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto pt-12 pb-24 px-4 text-center">
          <AlertTriangle size={28} className="mx-auto text-red-400 mb-3" />
          <h1 className="text-xl font-bold text-text-primary mb-2">Tool not found</h1>
          <p className="text-sm text-text-secondary mb-6">
            {agentDisplayName} doesn't have Google Workspace in their trusted tools list.
          </p>
          <button
            onClick={() => navigate('/app/tools')}
            className="text-sm text-shell-400 hover:underline"
          >
            Back to Tools
          </button>
        </div>
      </div>
    );
  }

  const handleConnect = async () => {
    setError(null);
    setStep('connecting');
    try {
      const context: GoogleToolContext = {
        agentId: activeAgentId,
        toolServerCodename: tool.codename,
        toolDisplayName: tool.display_name,
        manifestUrl: tool.manifest_url,
        mcpUrl: tool.mcp_url,
        color: tool.color,
        icon: tool.icon,
        clientId: clientId.trim(),
      };
      const url = await startGoogleToolOAuth(context);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start OAuth.');
      setStep('configure');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto pt-12 pb-24 px-4">
        <button
          onClick={() => navigate('/app/tools/add')}
          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors mb-6"
        >
          <ChevronLeft size={14} />
          Pick a different tool
        </button>

        {step === 'promise' && (
          <PromiseStep
            agentDisplayName={agentDisplayName}
            tool={tool}
            onContinue={() => setStep('configure')}
          />
        )}

        {step === 'configure' && (
          <ConfigureStep
            agentDisplayName={agentDisplayName}
            tool={tool}
            clientId={clientId}
            onChangeClientId={setClientId}
            onBack={() => setStep('promise')}
            onConnect={handleConnect}
            error={error}
          />
        )}

        {step === 'connecting' && <ConnectingStep />}
      </div>
    </div>
  );
}

function PromiseStep({
  agentDisplayName,
  tool,
  onContinue,
}: {
  agentDisplayName: string;
  tool: TrustedToolServer;
  onContinue: () => void;
}) {
  return (
    <div>
      <div className="w-20 h-20 rounded-full bg-surface-2 border-2 border-shell-500/40 flex items-center justify-center text-4xl mx-auto mb-5 shadow-lg shadow-shell-500/10">
        📬
      </div>
      <h1 className="text-2xl font-bold text-text-primary mb-2 text-center">
        Connect Google Workspace to {agentDisplayName}
      </h1>
      <p className="text-sm text-text-muted uppercase tracking-wider text-center mb-8">
        Tool · {tool.codename}
      </p>

      <div className="space-y-4 text-sm text-text-secondary leading-relaxed mb-8">
        <p>
          When you connect Google, {agentDisplayName} can help you with the things living in
          your Workspace — search your email, look at your calendar, pull files out of Drive,
          read a Doc or Sheet. She only sees what you have access to.
        </p>
        <p className="bg-surface-2 border border-border-muted rounded-lg p-4">
          <span className="font-medium text-text-primary">How we keep your login safe:</span>{' '}
          Your Google login lives on your device for a split second, long enough for us to
          seal it with a key only the Google tool's server can open. After that, even we
          couldn't read it if we tried.
        </p>
        <p className="text-xs text-text-muted border-l-2 border-red-500/40 pl-4">
          {tool.recovery_copy ||
            "We can't help you recover this connection. If it ever breaks, you'll reconnect from here — fresh login, fresh seal."}
        </p>
      </div>

      <button
        onClick={onContinue}
        className="w-full py-3 rounded-lg bg-shell-600/20 border border-shell-500/30 text-shell-300 hover:bg-shell-600/30 font-medium transition-colors"
      >
        I understand — let's connect
      </button>
    </div>
  );
}

function ConfigureStep({
  agentDisplayName,
  tool,
  clientId,
  onChangeClientId,
  onBack,
  onConnect,
  error,
}: {
  agentDisplayName: string;
  tool: TrustedToolServer;
  clientId: string;
  onChangeClientId: (v: string) => void;
  onBack: () => void;
  onConnect: () => void;
  error: string | null;
}) {
  const callbackUrl = `${window.location.origin}/oauth/tool-callback/google`;
  // Consumer Key input is optional if a TurtleShell default was
  // shipped at build time (VITE_GOOGLE_CLIENT_ID). Otherwise, user
  // has to bring their own until the canonical app ships.
  const hasBuildTimeDefault = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const canConnect = hasBuildTimeDefault || clientId.trim().length >= 20;

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-2">
        Set up your Google connection for {agentDisplayName}
      </h1>
      <p className="text-sm text-text-secondary mb-6 leading-relaxed">
        Google signs you in through accounts.google.com. If your workspace is on a custom
        domain, that still works — you'll sign in as your Workspace user.
      </p>

      <FormField
        label="OAuth 2.0 Client ID"
        hint="From Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs. Web application type. The ID is safe to paste here — it's a public identifier, not a secret."
        required={!hasBuildTimeDefault}
      >
        <input
          type="text"
          value={clientId}
          onChange={(e) => onChangeClientId(e.target.value)}
          placeholder="12345-abcde.apps.googleusercontent.com"
          spellCheck={false}
          autoComplete="off"
          className="w-full px-3 py-2 bg-surface-1 border border-border-default rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-shell-500"
        />
        <a
          href="https://console.cloud.google.com/auth/clients"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-shell-400 hover:text-shell-300 mt-2"
        >
          <ExternalLink size={12} />
          Open Google Auth Platform → Clients
        </a>
        {hasBuildTimeDefault && !clientId && (
          <div className="text-xs text-text-muted mt-2">
            Leave blank to use TurtleShell's default Google client.
          </div>
        )}
      </FormField>

      <SetupChecklist callbackUrl={callbackUrl} />

      {error && (
        <div className="text-sm text-red-400 mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-lg border border-border-default text-text-secondary hover:bg-surface-2 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onConnect}
          disabled={!canConnect}
          className="flex-[2] py-3 rounded-lg bg-shell-600/20 border border-shell-500/30 text-shell-300 hover:bg-shell-600/30 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Take me to Google
        </button>
      </div>

      <div className="mt-6 flex items-start gap-2 text-xs text-text-muted">
        <ShieldCheck size={14} className="mt-0.5 flex-shrink-0 text-shell-400" />
        <span>
          Google will show you the standard consent screen. We don't see anything you type
          there — Google redirects you back to us with a one-time code that only works for{' '}
          <span className="font-medium">{tool.codename}</span>.
        </span>
      </div>
    </div>
  );
}

function FormField({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-2 mb-1">
        <label className="text-sm font-medium text-text-primary">{label}</label>
        {required && <span className="text-xs text-shell-400">required</span>}
      </div>
      {hint && <p className="text-xs text-text-muted mb-2">{hint}</p>}
      {children}
    </div>
  );
}

function SetupChecklist({ callbackUrl }: { callbackUrl: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(callbackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // non-fatal
    }
  };

  return (
    <details className="mb-6 border border-border-muted rounded-lg bg-surface-1 open:bg-surface-2">
      <summary className="px-4 py-3 text-sm text-text-primary cursor-pointer hover:text-shell-300 flex items-center gap-2">
        <ShieldCheck size={14} className="text-shell-400" />
        What to configure in your Google Cloud OAuth client
      </summary>
      <div className="px-4 pb-4 pt-2 space-y-4 text-xs text-text-secondary leading-relaxed">
        <p className="pb-1">
          Google's console can look intimidating. The whole ceremony is three short
          screens and takes about 3 minutes the first time.
        </p>
        <ol className="list-decimal list-outside ml-4 space-y-3">
          <li>
            <span className="font-medium text-text-primary">Open Google Auth Platform.</span>{' '}
            <a
              href="https://console.cloud.google.com/auth/clients"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-shell-400 hover:text-shell-300 underline"
            >
              console.cloud.google.com/auth/clients <ExternalLink size={11} />
            </a>
            {' '}— if Google asks you to pick or create a project, pick one (or click
            <span className="font-medium"> New Project</span>). The first visit also
            asks you to configure the app's "branding" (just a name + support email
            — anything sensible works) and pick the audience (pick{' '}
            <span className="font-medium">External</span> unless you're in a Google
            Workspace org doing an internal-only rollout).
          </li>
          <li>
            <span className="font-medium text-text-primary">Create a Client.</span>{' '}
            Click <span className="font-medium">+ Create Client</span>. Pick
            <span className="font-medium"> Web application</span> for Application type.
            Give it a name ("TurtleShell" works).
          </li>
          <li>
            <span className="font-medium text-text-primary">Add this redirect URI.</span>{' '}
            Under <span className="font-medium">Authorized redirect URIs</span>, click
            <span className="font-medium"> Add URI</span> and paste this (click the
            copy button):
            <div className="mt-2 flex items-center gap-2 bg-surface-0 border border-border-default rounded-lg px-3 py-2 font-mono text-xs">
              <span className="flex-1 truncate text-text-primary">{callbackUrl}</span>
              <button
                type="button"
                onClick={copy}
                className="flex items-center gap-1 text-shell-400 hover:text-shell-300"
                title="Copy to clipboard"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            Click <span className="font-medium">Create</span>.
          </li>
          <li>
            <span className="font-medium text-text-primary">Copy the Client ID.</span>{' '}
            Google shows a dialog with both a{' '}
            <span className="font-medium">Client ID</span> and a{' '}
            <span className="font-medium">Client secret</span>. You want the{' '}
            <span className="font-medium">Client ID</span> — ends in{' '}
            <span className="font-mono">.apps.googleusercontent.com</span>. Copy it and
            paste into the field above. You can ignore the Client secret — we don't use it.
          </li>
          <li>
            <span className="font-medium text-text-primary">Turn on the APIs you want.</span>{' '}
            In the left nav go to <span className="font-medium">Enabled APIs & services</span>{' '}
            →{' '}
            <a
              href="https://console.cloud.google.com/apis/library"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-shell-400 hover:text-shell-300 underline"
            >
              API Library <ExternalLink size={11} />
            </a>
            . Turn on <span className="font-medium">Gmail API</span>,{' '}
            <span className="font-medium">Google Calendar API</span>,{' '}
            <span className="font-medium">Google Drive API</span>,{' '}
            <span className="font-medium">Google Docs API</span>, and{' '}
            <span className="font-medium">Google Sheets API</span>. Each is a one-click
            enable.
          </li>
          <li>
            <span className="font-medium text-text-primary">Add your scopes.</span>{' '}
            Under <span className="font-medium">Data Access</span> (or{' '}
            <span className="font-medium">OAuth consent screen → Scopes</span> in older
            layouts), add these:
            <ul className="list-disc list-outside ml-5 mt-1 font-mono text-text-primary">
              <li>openid, email, profile</li>
              <li>gmail.readonly</li>
              <li>calendar.events</li>
              <li>drive.readonly</li>
              <li>spreadsheets.readonly</li>
              <li>documents.readonly</li>
            </ul>
          </li>
          <li>
            <span className="font-medium text-text-primary">Paste the Client ID above and click "Take me to Google".</span>{' '}
            Google will sign you in, show a consent screen listing the scopes, and
            bring you back here.
          </li>
        </ol>
        <p className="pt-2 border-t border-border-muted text-text-muted">
          If the first OAuth attempt fails with{' '}
          <span className="font-mono">invalid_redirect_uri</span>, the redirect URI in
          step 3 didn't save or is slightly different (watch for trailing slashes).
          Re-open the Client in Google Auth Platform → Clients and double-check.
        </p>
      </div>
    </details>
  );
}

function ConnectingStep() {
  return (
    <div className="text-center py-12">
      <Loader2 size={32} className="mx-auto text-shell-400 animate-spin mb-4" />
      <p className="text-sm text-text-secondary">Taking you to Google…</p>
    </div>
  );
}
