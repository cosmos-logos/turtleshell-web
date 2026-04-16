import { useEffect, useState } from 'react';
import { ogRequest } from '@/lib/api/olympus-grid-client';
import { useEnvironmentStore } from '@/lib/store/environment-store';

/**
 * Server-gated developer-mode flag, mirrors the iris portal hook.
 *
 * Reads `TurtleshellProfile__c.AllowDeveloperMode__c` via the profile GET
 * on mount. The admin flips this in Salesforce; clients **must not** write
 * to it — the Apex PUT handler ignores client attempts.
 *
 * Behaviour when the server returns `false`:
 *   - Hide every developer affordance (Developer Mode toggle, Test Beta
 *     Features, Agent Avatars, Agent Theme, environment picker).
 *   - Force-revert local `developerMode` and `testBetaEnabled` back to
 *     `false` so a stale zustand-persist carry-over doesn't leak dev UI.
 *   - App Store review policy requires the default experience to have
 *     zero developer affordances visible.
 *
 * Returns `true | false | null`. Null is the loading state — treated as
 * disabled to avoid a flash of developer UI for users who shouldn't have it.
 *
 * Fails closed: if the profile endpoint is unreachable or the field is
 * missing from the response (e.g., pre-#224 alpha-org where the column
 * doesn't exist yet), returns `false`.
 */
export function useAllowDeveloperMode(): boolean | null {
    const [allowed, setAllowed] = useState<boolean | null>(null);
    const developerMode = useEnvironmentStore((s) => s.developerMode);
    const testBetaEnabled = useEnvironmentStore((s) => s.testBetaEnabled);
    const setDeveloperMode = useEnvironmentStore((s) => s.setDeveloperMode);
    const setTestBetaEnabled = useEnvironmentStore((s) => s.setTestBetaEnabled);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                // `turtleshell_username` is set at onboarding + on handle
                // rename. Users who predate that write path (or cleared
                // their storage) still need the dev-mode gate to resolve
                // correctly, so fall back to the email local-part — same
                // derivation the Sidebar and Profile page use, and the
                // same one iOS applies before it stores the username
                // server-side.
                let username = localStorage.getItem('turtleshell_username') || '';
                if (!username) {
                    const email = localStorage.getItem('olympus_grid_email') || '';
                    const local = email.split('@')[0] || '';
                    username = local.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                }
                if (!username) {
                    if (!cancelled) setAllowed(false);
                    return;
                }
                const res = (await ogRequest(
                    'GET',
                    `/turtleshell/profile/${encodeURIComponent(username)}`,
                )) as { allowDeveloperMode?: boolean };
                if (cancelled) return;
                const next = res?.allowDeveloperMode === true;
                setAllowed(next);
                // Force-revert any locally-persisted dev flags when the
                // server says no. Zustand-persist restores from localStorage
                // before this effect runs, so without this reconcile the
                // toggles would briefly flash ON after revocation.
                if (!next) {
                    if (developerMode) setDeveloperMode(false);
                    if (testBetaEnabled) setTestBetaEnabled(false);
                }
            } catch (e) {
                // Endpoint unreachable / field missing → fail closed.
                if (!cancelled) setAllowed(false);
                console.warn('[useAllowDeveloperMode] profile fetch failed:', e);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return allowed;
}
