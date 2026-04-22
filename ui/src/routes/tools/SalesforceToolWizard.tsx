// routes/tools/SalesforceToolWizard.tsx
//
// Three-step warm wizard for adding Salesforce to the active agent:
//   1) Promise   — what we will and won't see when you connect
//   2) Org URL   — pick the SF org (default: login.salesforce.com)
//   3) Connect   — kick off OAuth; the callback handles the rest
//
// Copy is written for a user who doesn't know what "OAuth" or "PKCE"
// means but knows the difference between respectful and robotic
// software. LastPass disclaimer is loud because the user needs to
// understand: if they lose access, they reconnect — we can't help.

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Loader2, ShieldCheck, AlertTriangle, Copy, Check } from 'lucide-react';
import { useChatStore } from '@/lib/store/chat-store';
import { getManifestForAgentId } from '@/manifests';
import type { TrustedToolServer } from '@/lib/cosmos-logos/types';
import {
  startSalesforceToolOAuth,
  type SalesforceToolContext,
} from '@/lib/tools/salesforce-tool-oauth';

type Step = 'promise' | 'org' | 'connecting';

const DEFAULT_SF_ORG_URL = 'https://login.salesforce.com';
const SANDBOX_SF_ORG_URL = 'https://test.salesforce.com';

export function SalesforceToolWizard() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const activeAgentId = useChatStore((s) => s.activeAgentId);

  const [step, setStep] = useState<Step>('promise');
  const [instanceUrl, setInstanceUrl] = useState<string>(DEFAULT_SF_ORG_URL);
  const [clientId, setClientId] = useState<string>(() => {
    // Seed from the legacy override if one happens to still be in
    // localStorage from an older build, so the user doesn't have to
    // retype it. Then immediately wipe that key — the tool flow no
    // longer stores client_id in localStorage. From this point on
    // clientId lives in React state only, travelling through the
    // OAuth roundtrip via the sessionStorage context blob.
    let seed = '';
    try {
      seed = localStorage.getItem('sf_client_id_override') || '';
      if (seed) localStorage.removeItem('sf_client_id_override');
    } catch {
      // non-fatal
    }
    return seed;
  });
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
            {agentDisplayName} doesn't have Salesforce in her trusted tools list.
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
      const context: SalesforceToolContext = {
        agentId: activeAgentId,
        toolServerCodename: tool.codename,
        toolDisplayName: tool.display_name,
        manifestUrl: tool.manifest_url,
        mcpUrl: tool.mcp_url,
        color: tool.color,
        icon: tool.icon,
        clientId: clientId.trim(),
      };
      const url = await startSalesforceToolOAuth(instanceUrl, context);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start OAuth.');
      setStep('org');
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
            onContinue={() => setStep('org')}
          />
        )}

        {step === 'org' && (
          <OrgStep
            agentDisplayName={agentDisplayName}
            tool={tool}
            instanceUrl={instanceUrl}
            onChangeInstanceUrl={setInstanceUrl}
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
        ☁️
      </div>

      <h1 className="text-2xl font-bold text-text-primary mb-2 text-center">
        Connect Salesforce to {agentDisplayName}
      </h1>
      <p className="text-sm text-text-muted uppercase tracking-wider text-center mb-8">
        Tool · {tool.codename}
      </p>

      <div className="space-y-4 text-sm text-text-secondary leading-relaxed mb-8">
        <p>
          When you connect Salesforce, {agentDisplayName} can help you with the things living
          in your org — look up accounts, draft case comments, pull a list of open
          opportunities. She only works on data you have permission to see.
        </p>
        <p className="bg-surface-2 border border-border-muted rounded-lg p-4">
          <span className="font-medium text-text-primary">How we keep your login safe:</span>{' '}
          Your Salesforce login lives on your device for a split second, long enough for us
          to seal it with a key only the Salesforce tool's server can open. After that,
          even we couldn't read it if we tried.
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

function OrgStep({
  agentDisplayName,
  tool,
  instanceUrl,
  onChangeInstanceUrl,
  clientId,
  onChangeClientId,
  onBack,
  onConnect,
  error,
}: {
  agentDisplayName: string;
  tool: TrustedToolServer;
  instanceUrl: string;
  onChangeInstanceUrl: (v: string) => void;
  clientId: string;
  onChangeClientId: (v: string) => void;
  onBack: () => void;
  onConnect: () => void;
  error: string | null;
}) {
  // The callback URL is derived from origin so it always matches
  // whatever domain the user is running. Surfacing it here lets
  // them copy-paste into Setup → App Manager → Edit without having
  // to guess at what we'll send in the OAuth request.
  const callbackUrl = `${window.location.origin}/oauth/tool-callback/salesforce`;

  // Button is only active once both requirements are met — SF will
  // reject either missing one, and we want to fail inside the wizard
  // (cleanly) instead of after the roundtrip to login.salesforce.com.
  const canConnect =
    instanceUrl.startsWith('https://') && clientId.trim().length >= 20;

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-2">
        Connect {agentDisplayName} to your Salesforce org
      </h1>
      <p className="text-sm text-text-secondary mb-6 leading-relaxed">
        Two pieces of info from Salesforce. Your login never leaves your device in
        plaintext — after Salesforce hands us the token, we seal it on your machine
        and throw away the original.
      </p>

      {/* ── 1. Org URL ───────────────────────────────── */}
      <FormField
        label="Your Salesforce org URL"
        hint="Production, a sandbox, a scratch org — whichever org you want to connect."
      >
        <div className="space-y-2">
          <div className="flex gap-2">
            <QuickPick
              active={instanceUrl === DEFAULT_SF_ORG_URL}
              onClick={() => onChangeInstanceUrl(DEFAULT_SF_ORG_URL)}
              label="Production"
              sub="login.salesforce.com"
            />
            <QuickPick
              active={instanceUrl === SANDBOX_SF_ORG_URL}
              onClick={() => onChangeInstanceUrl(SANDBOX_SF_ORG_URL)}
              label="Sandbox"
              sub="test.salesforce.com"
            />
          </div>
          <input
            type="url"
            value={instanceUrl}
            onChange={(e) => onChangeInstanceUrl(e.target.value)}
            placeholder="https://yourdomain.my.salesforce.com"
            className="w-full px-3 py-2 bg-surface-1 border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:border-shell-500"
          />
          <div className="text-xs text-text-muted">
            Scratch orgs and custom My Domains go here — paste the full <span className="font-mono">https://</span> URL.
          </div>
        </div>
      </FormField>

      {/* ── 2. Consumer Key (required) ───────────────── */}
      <FormField
        label="Connected App consumer key"
        hint="From Setup → App Manager → your Connected App → View → Consumer Key."
        required
      >
        <input
          type="text"
          value={clientId}
          onChange={(e) => onChangeClientId(e.target.value)}
          placeholder="3MVG9..."
          spellCheck={false}
          autoComplete="off"
          className="w-full px-3 py-2 bg-surface-1 border border-border-default rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-shell-500"
        />
        <div className="text-xs text-text-muted mt-2">
          Until TurtleShell ships an official Connected App for every org, you
          bring your own. Pre-filled if you've connected before.
        </div>
      </FormField>

      {/* ── Setup Checklist ──────────────────────────── */}
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
          Take me to Salesforce
        </button>
      </div>

      <div className="mt-6 flex items-start gap-2 text-xs text-text-muted">
        <ShieldCheck size={14} className="mt-0.5 flex-shrink-0 text-shell-400" />
        <span>
          Salesforce will show you a standard login + consent screen. We don't see anything
          you type there — Salesforce redirects you back to us with a one-time code that
          only works for <span className="font-medium">{tool.codename}</span>.
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

function QuickPick({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-2 rounded-lg border text-left transition-colors ${
        active
          ? 'bg-shell-600/20 border-shell-500/40'
          : 'bg-surface-1 border-border-muted hover:bg-surface-2'
      }`}
    >
      <div className="text-sm font-medium text-text-primary">{label}</div>
      <div className="text-xs text-text-muted">{sub}</div>
    </button>
  );
}

/**
 * Collapsible panel that tells the user exactly what to configure in
 * Salesforce. We surface the callback URL with a copy button because
 * mistyping it is the #1 cause of "invalid_redirect_uri" failures
 * during OAuth — removing that friction is worth the pixels.
 */
function SetupChecklist({ callbackUrl }: { callbackUrl: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(callbackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // non-fatal — older browsers without clipboard API
    }
  };

  return (
    <details className="mb-6 border border-border-muted rounded-lg bg-surface-1 open:bg-surface-2">
      <summary className="px-4 py-3 text-sm text-text-primary cursor-pointer hover:text-shell-300 flex items-center gap-2">
        <ShieldCheck size={14} className="text-shell-400" />
        What to configure in your Salesforce Connected App
      </summary>
      <div className="px-4 pb-4 pt-2 space-y-4 text-xs text-text-secondary leading-relaxed">
        <ol className="list-decimal list-inside space-y-2">
          <li>
            In your org: Setup → <span className="font-medium">App Manager</span> → your
            Connected App → <span className="font-medium">Edit</span>
          </li>
          <li>
            Add this callback URL (click to copy):
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
          </li>
          <li>
            Under <span className="font-medium">Selected OAuth Scopes</span>, make sure
            these are present:
            <ul className="list-disc list-inside ml-4 mt-1 font-mono text-text-primary">
              <li>api</li>
              <li>refresh_token, offline_access</li>
            </ul>
          </li>
          <li>
            Uncheck <span className="font-medium">Require Secret for Refresh Token Flow</span>{' '}
            — our model sends <span className="font-mono">client_id</span> only, no secret.
          </li>
          <li>
            Save. Salesforce sometimes needs a minute to propagate. If the first OAuth
            attempt errors with <span className="font-mono">invalid_redirect_uri</span>, wait 60 seconds and try again.
          </li>
          <li>
            Back on the Connected App detail page, click <span className="font-medium">View</span>{' '}
            and copy the <span className="font-medium">Consumer Key</span> into the field above.
          </li>
        </ol>
      </div>
    </details>
  );
}

function ConnectingStep() {
  return (
    <div className="text-center py-12">
      <Loader2 size={32} className="mx-auto text-shell-400 animate-spin mb-4" />
      <p className="text-sm text-text-secondary">Taking you to Salesforce…</p>
    </div>
  );
}
