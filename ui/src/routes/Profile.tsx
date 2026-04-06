import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import { agentDisplayName } from '@/lib/cosmos-logos/types';
import { ogRequest } from '@/lib/api/olympus-grid-client';

const CAUSE_MAP: Record<string, { emoji: string }> = {
  'Save the Oceans': { emoji: '🌊' },
  'Clean Water for All': { emoji: '💧' },
  'AI for Those in Need': { emoji: '🤝' },
};

const GUIDE_MAP: Record<string, { emoji: string; name: string; role: string }> = {
  athena: { emoji: '🐙', name: 'Athena', role: 'LLM Router · Old Night' },
  cosmos: { emoji: '🐟', name: 'Cosmos', role: 'The Ancient One · Navigator' },
  logos: { emoji: '🐢', name: 'Logos', role: 'The Word · Sovereign Vessel' },
  custom: { emoji: '✨', name: 'Make Your Own', role: 'Your Agent · Your Identity' },
};

interface ProfileData {
  username?: string;
  displayName?: string;
  bio?: string;
  cause?: string;
  guideAgent?: string;
  shellBalance?: number;
  shellsGiven?: number;
  avatarUrl?: string;
  profilePublic?: boolean;
  tierId?: string;
  onboardingComplete?: boolean;
}

export function Profile() {
  const connectedAgents = useCosmosLogosStore(s => s.agents);
  const setActiveChatAgent = useCosmosLogosStore(s => s.setActiveChatAgent);
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const username = localStorage.getItem('turtleshell_username');
        if (!username) { setLoading(false); return; }
        const data = await ogRequest('GET', `/turtleshell/profile/${username}`) as any;
        setProfile(data);
      } catch (e: any) {
        console.error('[Profile] fetch failed:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const hasProfile = !!profile?.username;
  const needsOnboarding = !hasProfile || !profile?.cause;
  const cause = profile?.cause ? CAUSE_MAP[profile.cause] : null;
  const guide = profile?.guideAgent ? GUIDE_MAP[profile.guideAgent] : null;
  const email = localStorage.getItem('olympus_grid_email') || '';
  const displayName = profile?.displayName || localStorage.getItem('turtleshell_username') || email.split('@')[0] || '';
  const username = profile?.username || localStorage.getItem('turtleshell_username') || '';

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto bg-surface-0 flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl block mb-4 animate-pulse">🐢</span>
          <p className="text-sm text-text-muted">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-surface-0">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-surface-2 border border-border-muted flex items-center justify-center text-3xl shrink-0">
              {guide?.emoji || '🐢'}
            </div>
            {hasProfile && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-shell-500 border-2 border-surface-0 flex items-center justify-center text-[9px] font-bold text-white">✓</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-text-primary truncate">{displayName}</h1>
            {username && (
              <Link to={`/u/${username}`} className="text-sm text-shell-400 font-medium no-underline hover:underline">
                @{username}
              </Link>
            )}
            {email && <p className="text-xs text-text-muted mt-0.5 truncate">{email}</p>}
          </div>
        </div>

        {/* Onboarding CTA */}
        {needsOnboarding && (
          <div className="bg-shell-500/5 border border-shell-500/20 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🐢</span>
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Complete Your Profile</h2>
                <p className="text-xs text-text-muted">Choose your cause, claim your shells, and enter the ocean.</p>
              </div>
            </div>
            <Link to="/onboarding" className="block w-full text-center py-2.5 rounded-lg text-sm font-semibold no-underline bg-shell-500 text-white hover:bg-shell-600 transition-colors">
              Start Onboarding
            </Link>
          </div>
        )}

        {/* Stats row */}
        {hasProfile && (
          <div className="grid grid-cols-3 divide-x divide-border-muted border border-border-muted rounded-xl bg-surface-1">
            {[
              { value: String(connectedAgents.length || '0'), label: 'Gods Online' },
              { value: (profile?.shellBalance ?? 0).toLocaleString(), label: 'Sea Shells' },
              { value: (profile?.shellsGiven ?? 0).toLocaleString(), label: 'Shells Given' },
            ].map((s, i) => (
              <div key={i} className="py-4 text-center">
                <span className="text-lg font-bold text-text-primary block">{s.value}</span>
                <span className="text-[10px] tracking-widest uppercase text-text-muted">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Cause */}
        {cause && profile?.cause && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-2">
              <span>My Cause</span>
            </h3>
            <div className="flex items-center gap-3 rounded-xl p-4 bg-surface-1 border border-border-muted">
              <span className="text-2xl">{cause.emoji}</span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-shell-400">{profile.cause}</div>
                <div className="text-xs text-text-muted">Permanent · chosen at the beginning</div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-lg font-bold text-text-primary block">{profile?.shellsGiven ?? 0}</span>
                <span className="text-[10px] text-text-muted">given</span>
              </div>
            </div>
          </div>
        )}

        {/* Guide */}
        {guide && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">My Guide</h3>
            <div className="flex items-center gap-3 rounded-xl p-4 bg-surface-1 border border-border-muted">
              <div className="w-10 h-10 rounded-full bg-surface-2 border border-border-muted flex items-center justify-center text-xl shrink-0">
                {guide.emoji}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-shell-400">{guide.name}</div>
                <div className="text-[11px] uppercase tracking-wider text-text-muted">{guide.role}</div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-shell-400">
                <div className="w-1.5 h-1.5 rounded-full bg-shell-400 animate-pulse" />Active
              </div>
            </div>
          </div>
        )}

        {/* Connected gods */}
        {connectedAgents.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Connected Gods</h3>
            <div className="flex flex-wrap gap-2">
              {connectedAgents.map((a, i) => (
                <button key={i} onClick={() => {
                  if (a.manifest.display?.app_url) {
                    navigate(`/app/agent/${a.id}`);
                  } else {
                    setActiveChatAgent(a.id);
                    navigate('/app/chat');
                  }
                }} className="text-xs rounded-full px-3 py-1.5 bg-surface-1 border border-border-muted text-text-secondary hover:text-shell-400 hover:border-shell-500/40 transition-colors cursor-pointer">
                  {agentDisplayName(a)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          <Link to="/guide-selection" className="block w-full text-center py-2.5 rounded-lg text-sm font-medium no-underline bg-surface-1 border border-border-muted text-text-muted hover:text-text-secondary hover:border-border-default transition-colors">
            Change Guide
          </Link>
          <Link to="/onboarding" className="block w-full text-center py-2.5 rounded-lg text-sm font-medium no-underline bg-surface-1 border border-border-muted text-text-muted hover:text-text-secondary hover:border-border-default transition-colors">
            {needsOnboarding ? 'Start Onboarding' : 'Redo Onboarding'}
          </Link>
          <Link to="/app/settings" className="block w-full text-center py-2.5 rounded-lg text-sm font-medium no-underline bg-surface-1 border border-border-muted text-text-muted hover:text-text-secondary hover:border-border-default transition-colors">
            Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
