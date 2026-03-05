import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, RefreshCw, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { useServiceStore } from '@/lib/store/service-store';
import { listCases, createCase, isOlympusGridTokenPresent } from '@/lib/api/olympus-grid-client';
import type { CaseRecord } from '@/types/service';

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-500/10 text-blue-400',
  Working: 'bg-yellow-500/10 text-yellow-400',
  Escalated: 'bg-orange-500/10 text-orange-400',
  Closed: 'bg-surface-3 text-text-muted',
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: 'bg-surface-3 text-text-muted',
  Medium: 'bg-blue-500/10 text-blue-400',
  High: 'bg-orange-500/10 text-orange-400',
  Critical: 'bg-red-500/10 text-red-400',
};

export function ServiceDesk() {
  const isConnected = useServiceStore((s) => s.isOlympusGridConnected());
  const disconnectOlympusGrid = useServiceStore((s) => s.disconnectOlympusGrid);

  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState('');

  const hasTokens = isOlympusGridTokenPresent();
  const canUseServiceDesk = isConnected && hasTokens;

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listCases();
      setCases(data);
    } catch (e) {
      if (e instanceof Error && /40[13]/.test(e.message)) {
        disconnectOlympusGrid();
      }
    } finally {
      setLoading(false);
    }
  }, [disconnectOlympusGrid]);

  useEffect(() => {
    if (canUseServiceDesk) fetchCases();
  }, [canUseServiceDesk, fetchCases]);

  if (!canUseServiceDesk) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Service Desk</h1>
          </div>
          <div className="border border-dashed border-border rounded-xl p-8 text-center space-y-3">
            <p className="text-sm text-text-muted">
              Connect Olympus-Grid in Services to access the Service Desk.
            </p>
            <Link
              to="/app/services"
              className="inline-block text-sm text-shell-400 hover:underline"
            >
              Go to Services
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleCreateCase = async () => {
    if (!subject.trim() || !description.trim()) return;
    setCreating(true);
    try {
      const result = await createCase(subject, description);
      setCreateSuccess(`Case ${result.caseNumber} created`);
      setSubject('');
      setDescription('');
      setTimeout(() => {
        setCreateSuccess('');
        setShowForm(false);
      }, 2000);
      fetchCases();
    } catch {
      // Error handled silently — form stays open for retry
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Service Desk</h1>
            <p className="text-sm text-text-muted mt-1">
              View and manage your support cases.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchCases}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-surface-3 text-text-muted transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-shell-500/10 text-shell-400 hover:bg-shell-500/20 rounded-lg transition-colors"
            >
              <Plus size={14} /> New Case
            </button>
          </div>
        </div>

        {/* Create Case Form */}
        {showForm && (
          <div className="p-4 bg-surface-1 border border-border-muted rounded-xl space-y-3">
            {createSuccess ? (
              <p className="text-sm text-shell-400 font-medium">{createSuccess}</p>
            ) : (
              <>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full px-3 py-2 bg-surface-2 border border-border-muted rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-400 transition-colors"
                  autoFocus
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description"
                  rows={3}
                  className="w-full px-3 py-2 bg-surface-2 border border-border-muted rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-400 transition-colors resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCreateCase}
                    disabled={!subject.trim() || !description.trim() || creating}
                    className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 bg-shell-500 text-white rounded-lg hover:bg-shell-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {creating && <Loader2 size={14} className="animate-spin" />}
                    Create Case
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-xs text-text-muted hover:text-text-secondary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Cases List */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Cases
          </h2>

          {loading && cases.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="text-text-muted animate-spin" />
            </div>
          ) : cases.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-8 text-center">
              <p className="text-sm text-text-muted">No cases yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cases.map((c) => (
                <div
                  key={c.Id}
                  className="p-4 bg-surface-1 border border-border-muted rounded-xl hover:border-border transition-colors"
                >
                  <button
                    onClick={() => setExpandedId(expandedId === c.Id ? null : c.Id)}
                    className="w-full flex items-start justify-between gap-3 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xs font-mono text-text-muted">
                          {c.CaseNumber}
                        </span>
                        <span
                          className={`text-2xs font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLORS[c.Status] ?? 'bg-surface-3 text-text-muted'}`}
                        >
                          {c.Status}
                        </span>
                        <span
                          className={`text-2xs font-medium px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[c.Priority] ?? 'bg-surface-3 text-text-muted'}`}
                        >
                          {c.Priority}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-text-primary truncate">
                        {c.Subject}
                      </div>
                      <div className="text-2xs text-text-muted mt-0.5">
                        {new Date(c.CreatedDate).toLocaleDateString()}
                      </div>
                    </div>
                    {expandedId === c.Id ? (
                      <ChevronDown size={16} className="text-text-muted flex-shrink-0 mt-1" />
                    ) : (
                      <ChevronRight size={16} className="text-text-muted flex-shrink-0 mt-1" />
                    )}
                  </button>
                  {expandedId === c.Id && c.Description && (
                    <div className="mt-3 pt-3 border-t border-border-muted">
                      <p className="text-sm text-text-secondary whitespace-pre-wrap">
                        {c.Description}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
