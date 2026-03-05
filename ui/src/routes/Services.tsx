import { useState } from 'react';
import { Plug, ExternalLink, Trash2, Plus, Zap, Loader2 } from 'lucide-react';
import { useServiceStore } from '@/lib/store/service-store';
import { useEnvironmentStore } from '@/lib/store/environment-store';
import { SERVICE_CATALOG } from '@/types/service';
import { OlympusGridConnect } from '@/components/services/OlympusGridConnect';
import { SalesforceConnect } from '@/components/services/SalesforceConnect';
import { GitHubConnect } from '@/components/services/GitHubConnect';
import { GoogleConnect } from '@/components/services/GoogleConnect';
import { HubSpotConnect } from '@/components/services/HubSpotConnect';
import { WorkdayConnect } from '@/components/services/WorkdayConnect';
import { testConnection } from '@/lib/api/olympus-grid-client';
import type { TestConnectionResult } from '@/lib/api/olympus-grid-client';
import { testSalesforceConnection, getSalesforceInstanceUrl } from '@/lib/api/salesforce-client';
import type { SfTestConnectionResult } from '@/lib/api/salesforce-client';
import { testGitHubConnection, getStoredGitHubUser } from '@/lib/api/github-client';
import type { GhTestConnectionResult } from '@/lib/api/github-client';
import { testGoogleConnection, getStoredGoogleUser } from '@/lib/api/google-client';
import type { GoogleTestConnectionResult } from '@/lib/api/google-client';
import { testHubSpotConnection, getStoredHubSpotAccount } from '@/lib/api/hubspot-client';
import type { HsTestConnectionResult } from '@/lib/api/hubspot-client';
import { testWorkdayConnection, getStoredWorkdayAccount } from '@/lib/api/workday-client';
import type { WdTestConnectionResult } from '@/lib/api/workday-client';

function TestResultPanel({ result, onClose }: { result: TestConnectionResult | SfTestConnectionResult | GhTestConnectionResult | GoogleTestConnectionResult | HsTestConnectionResult | WdTestConnectionResult; onClose: () => void }) {
  const statusIcon = (s: 'pass' | 'fail' | 'skip') =>
    s === 'pass' ? '✓' : s === 'fail' ? '✗' : '—';
  const statusColor = (s: 'pass' | 'fail' | 'skip') =>
    s === 'pass' ? 'text-green-400' : s === 'fail' ? 'text-red-400' : 'text-text-muted';

  return (
    <div className={`mt-3 p-4 rounded-xl border space-y-3 ${
      result.overall === 'pass'
        ? 'bg-green-500/5 border-green-500/20'
        : 'bg-red-500/5 border-red-500/20'
    }`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${result.overall === 'pass' ? 'text-green-400' : 'text-red-400'}`}>
          Connection Test {result.overall === 'pass' ? 'Passed' : 'Failed'}
        </span>
        <button onClick={onClose} className="text-text-muted hover:text-text-secondary text-xs">
          Dismiss
        </button>
      </div>
      <div className="space-y-1.5">
        {result.steps.map((step, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className={`font-mono font-bold flex-shrink-0 ${statusColor(step.status)}`}>
              {statusIcon(step.status)}
            </span>
            <div className="min-w-0">
              <span className="font-medium text-text-primary">{step.label}</span>
              <span className="text-text-muted ml-1.5">{step.detail}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-2xs text-text-muted">Full details logged to browser console — filter by [OG], [SF], [GH], [GOOGLE], [HS], or [WD]</p>
    </div>
  );
}

export function Services() {
  const { services, remove, disconnectOlympusGrid, disconnectSalesforce, disconnectGitHub, disconnectGoogle, disconnectHubSpot, disconnectWorkday } = useServiceStore();
  const connectedServices = Object.values(services);
  const connectedProviders = new Set(connectedServices.map((s) => s.provider));
  const [olympusGridModalOpen, setOlympusGridModalOpen] = useState(false);
  const [salesforceModalOpen, setSalesforceModalOpen] = useState(false);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [hubspotModalOpen, setHubspotModalOpen] = useState(false);
  const [workdayModalOpen, setWorkdayModalOpen] = useState(false);
  const catalogServices = SERVICE_CATALOG.filter((s) => !connectedProviders.has(s.provider));

  const developerMode = useEnvironmentStore((s) => s.developerMode);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [sfTesting, setSfTesting] = useState(false);
  const [sfTestResult, setSfTestResult] = useState<SfTestConnectionResult | null>(null);
  const [ghTesting, setGhTesting] = useState(false);
  const [ghTestResult, setGhTestResult] = useState<GhTestConnectionResult | null>(null);
  const [googleTesting, setGoogleTesting] = useState(false);
  const [googleTestResult, setGoogleTestResult] = useState<GoogleTestConnectionResult | null>(null);
  const [hsTesting, setHsTesting] = useState(false);
  const [hsTestResult, setHsTestResult] = useState<HsTestConnectionResult | null>(null);
  const [wdTesting, setWdTesting] = useState(false);
  const [wdTestResult, setWdTestResult] = useState<WdTestConnectionResult | null>(null);

  const runTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection();
      setTestResult(result);
    } finally {
      setTesting(false);
    }
  };

  const runSfTestConnection = async () => {
    setSfTesting(true);
    setSfTestResult(null);
    try {
      const result = await testSalesforceConnection();
      setSfTestResult(result);
    } finally {
      setSfTesting(false);
    }
  };

  const runGhTestConnection = async () => {
    setGhTesting(true);
    setGhTestResult(null);
    try {
      const result = await testGitHubConnection();
      setGhTestResult(result);
    } finally {
      setGhTesting(false);
    }
  };

  const runGoogleTestConnection = async () => {
    setGoogleTesting(true);
    setGoogleTestResult(null);
    try {
      const result = await testGoogleConnection();
      setGoogleTestResult(result);
    } finally {
      setGoogleTesting(false);
    }
  };

  const runHsTestConnection = async () => {
    setHsTesting(true);
    setHsTestResult(null);
    try {
      const result = await testHubSpotConnection();
      setHsTestResult(result);
    } finally {
      setHsTesting(false);
    }
  };

  const runWdTestConnection = async () => {
    setWdTesting(true);
    setWdTestResult(null);
    try {
      const result = await testWorkdayConnection();
      setWdTestResult(result);
    } finally {
      setWdTesting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Services</h1>
          <p className="text-sm text-text-muted mt-1">
            Connect enterprise services to enable MCP-powered AI workflows.
          </p>
        </div>

        {/* Connected Services */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Connected
          </h2>

          {connectedServices.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-8 text-center">
              <Plug size={24} className="mx-auto mb-3 text-text-muted" />
              <p className="text-sm text-text-muted">
                No services connected yet. Add one below to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {connectedServices.map((service) => (
                <div key={service.id}>
                  <div className="flex items-center justify-between p-4 bg-surface-1 border border-border-muted rounded-xl hover:border-border transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-surface-3 rounded-lg flex items-center justify-center text-lg">
                        {SERVICE_CATALOG.find((s) => s.provider === service.provider)?.icon ?? '🔗'}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">
                          {service.displayName}
                        </div>
                        <div className="text-2xs text-text-muted">
                          {service.provider} · {service.category}
                          {service.environment && ` · ${service.environment}`}
                          {service.provider === 'salesforce' && getSalesforceInstanceUrl() && (
                            <> · {getSalesforceInstanceUrl()}</>
                          )}
                          {service.provider === 'github' && getStoredGitHubUser() && (
                            <> · @{getStoredGitHubUser()?.login}</>
                          )}
                          {service.provider === 'google' && getStoredGoogleUser() && (
                            <> · {getStoredGoogleUser()?.email}</>
                          )}
                          {service.provider === 'hubspot' && getStoredHubSpotAccount() && (
                            <> · Portal {getStoredHubSpotAccount()?.portalId}</>
                          )}
                          {service.provider === 'workday' && getStoredWorkdayAccount() && (
                            <> · {getStoredWorkdayAccount()?.tenant}</>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {developerMode && service.provider === 'olympus-grid' && (
                        <button
                          onClick={runTestConnection}
                          disabled={testing}
                          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-colors disabled:opacity-50"
                          title="Test Connection"
                        >
                          {testing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                          Test
                        </button>
                      )}
                      {developerMode && service.provider === 'salesforce' && (
                        <button
                          onClick={runSfTestConnection}
                          disabled={sfTesting}
                          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-colors disabled:opacity-50"
                          title="Test Salesforce Connection"
                        >
                          {sfTesting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                          Test
                        </button>
                      )}
                      {developerMode && service.provider === 'github' && (
                        <button
                          onClick={runGhTestConnection}
                          disabled={ghTesting}
                          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-colors disabled:opacity-50"
                          title="Test GitHub Connection"
                        >
                          {ghTesting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                          Test
                        </button>
                      )}
                      {developerMode && service.provider === 'google' && (
                        <button
                          onClick={runGoogleTestConnection}
                          disabled={googleTesting}
                          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-colors disabled:opacity-50"
                          title="Test Google Connection"
                        >
                          {googleTesting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                          Test
                        </button>
                      )}
                      {developerMode && service.provider === 'hubspot' && (
                        <button
                          onClick={runHsTestConnection}
                          disabled={hsTesting}
                          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-colors disabled:opacity-50"
                          title="Test HubSpot Connection"
                        >
                          {hsTesting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                          Test
                        </button>
                      )}
                      {developerMode && service.provider === 'workday' && (
                        <button
                          onClick={runWdTestConnection}
                          disabled={wdTesting}
                          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-colors disabled:opacity-50"
                          title="Test Workday Connection"
                        >
                          {wdTesting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                          Test
                        </button>
                      )}
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-shell-500/10 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-shell-400" />
                        <span className="text-2xs font-medium text-shell-400">Active</span>
                      </div>
                      <button
                        onClick={() => {
                          if (service.provider === 'olympus-grid') disconnectOlympusGrid();
                          else if (service.provider === 'salesforce') disconnectSalesforce();
                          else if (service.provider === 'github') disconnectGitHub();
                          else if (service.provider === 'google') disconnectGoogle();
                          else if (service.provider === 'hubspot') disconnectHubSpot();
                          else if (service.provider === 'workday') disconnectWorkday();
                          else remove(service.id);
                        }}
                        className="p-1.5 rounded-md hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {/* Test results appear under the service card */}
                  {service.provider === 'olympus-grid' && testResult && (
                    <TestResultPanel result={testResult} onClose={() => setTestResult(null)} />
                  )}
                  {service.provider === 'salesforce' && sfTestResult && (
                    <TestResultPanel result={sfTestResult} onClose={() => setSfTestResult(null)} />
                  )}
                  {service.provider === 'github' && ghTestResult && (
                    <TestResultPanel result={ghTestResult} onClose={() => setGhTestResult(null)} />
                  )}
                  {service.provider === 'google' && googleTestResult && (
                    <TestResultPanel result={googleTestResult} onClose={() => setGoogleTestResult(null)} />
                  )}
                  {service.provider === 'hubspot' && hsTestResult && (
                    <TestResultPanel result={hsTestResult} onClose={() => setHsTestResult(null)} />
                  )}
                  {service.provider === 'workday' && wdTestResult && (
                    <TestResultPanel result={wdTestResult} onClose={() => setWdTestResult(null)} />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Service Catalog */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Available Services
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {catalogServices.map((service) => (
              <div
                key={`${service.category}-${service.provider}`}
                className="p-4 bg-surface-1 border border-border-muted rounded-xl hover:border-border transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-surface-3 rounded-lg flex items-center justify-center text-lg">
                    {service.icon}
                  </div>
                  {service.status === 'coming_soon' && (
                    <span className="text-2xs font-medium px-2 py-0.5 bg-surface-3 text-text-muted rounded-full">
                      Coming Soon
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold mb-1">{service.label}</h3>
                <p className="text-2xs text-text-muted mb-3 leading-relaxed">
                  {service.description}
                </p>
                <button
                  disabled={service.status !== 'available'}
                  onClick={() => {
                    if (service.provider === 'olympus-grid') {
                      setOlympusGridModalOpen(true);
                    } else if (service.provider === 'salesforce') {
                      setSalesforceModalOpen(true);
                    } else if (service.provider === 'github') {
                      setGithubModalOpen(true);
                    } else if (service.provider === 'google') {
                      setGoogleModalOpen(true);
                    } else if (service.provider === 'hubspot') {
                      setHubspotModalOpen(true);
                    } else if (service.provider === 'workday') {
                      setWorkdayModalOpen(true);
                    }
                  }}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    service.status === 'available'
                      ? 'bg-shell-500/10 text-shell-400 hover:bg-shell-500/20'
                      : 'bg-surface-3 text-text-muted cursor-not-allowed'
                  }`}
                >
                  {service.status === 'available' ? (
                    <>
                      <Plus size={14} /> Connect
                    </>
                  ) : (
                    <>
                      <ExternalLink size={14} /> Notify Me
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <OlympusGridConnect
        open={olympusGridModalOpen}
        onOpenChange={setOlympusGridModalOpen}
      />

      <SalesforceConnect
        open={salesforceModalOpen}
        onOpenChange={setSalesforceModalOpen}
      />

      <GitHubConnect
        open={githubModalOpen}
        onOpenChange={setGithubModalOpen}
      />

      <GoogleConnect
        open={googleModalOpen}
        onOpenChange={setGoogleModalOpen}
      />

      <HubSpotConnect
        open={hubspotModalOpen}
        onOpenChange={setHubspotModalOpen}
      />

      <WorkdayConnect
        open={workdayModalOpen}
        onOpenChange={setWorkdayModalOpen}
      />
    </div>
  );
}
