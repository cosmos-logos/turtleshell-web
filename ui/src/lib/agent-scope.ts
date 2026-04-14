// ui/src/lib/agent-scope.ts
//
// Agent scope — "whose relationship am I looking at right now?"
//
// Memories and conversations are stamped with the agentId that was active when
// they were created. This module defines a single "scope" concept the UI uses
// to filter History and Memory pages: pick an agent in the header, see that
// agent's records only.
//
// Athena is special: the same Athena persona can run as athena-303 (local
// dev), athena-616 (offgrid), or athena-717 (cloud). Records stamped with any
// of those belong to the Athena relationship. So the scope is a FAMILY match
// via prefix, not an exact id match.

import { useMemo } from 'react';
import { useAgentStore } from '@/lib/store/agent-store';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import { agentDisplayName } from '@/lib/cosmos-logos/types';

export interface AgentScope {
    /**
     * Stable primitive identifier for this scope. Safe to use as a React
     * hook dependency — changes only when the active agent changes. Values:
     * 'builtin:cosmos' | 'builtin:logos' | 'athena' | `cosmos:${id}`
     */
    key: string;
    /** Short display name: "Athena", "Cosmos", "Logos", etc. */
    displayName: string;
    /** Single-char or emoji for avatar/title icons */
    avatar: string;
    /** Color from the agent's theme (cosmos agents only; builtins get shell-500) */
    color: string;
    /** Invitational greeting used in empty states */
    greeting: string;
    /** A short, concrete action the user can take right now */
    cta: string;
    /**
     * Does a given stored agentId belong to this scope?
     * - Cosmos/Logos (builtin): exact match on id
     * - Athena family: exact 'athena' OR prefix 'athena-'
     * - Other cosmos agents: exact cosmos agent id
     */
    matches: (agentId: string | null | undefined) => boolean;
    /**
     * Query params to send to Mnemosyne for server-side filtering.
     * Populates `agentIds` (CSV) and optionally `agentIdPrefix`.
     */
    toQueryParams: () => URLSearchParams;
    /** Broad category for branching UI logic */
    kind: 'builtin' | 'athena' | 'cosmos';
}

const ATHENA_GREETING = "I have been waiting. Ask me anything — this is where our memory begins.";
const ATHENA_CTA = "Open a conversation with Athena";

const COSMOS_GREETING = "I have been here four hundred million years. Your question is new to me — and welcome.";
const COSMOS_CTA = "Begin your first conversation with Cosmos";

const LOGOS_GREETING = "The shell is the platform. The word is sovereign. What would you have me carry?";
const LOGOS_CTA = "Begin your first conversation with Logos";

const DEFAULT_GREETING = "This is where your relationship begins. Every conversation, every memory — kept here, scoped to this agent.";
const DEFAULT_CTA = "Start a conversation";

/**
 * Is a codename part of the Athena family?
 * Matches 'athena', 'athena-303', 'athena-616', 'athena-717', 'athena-anything'.
 */
export function isAthenaFamily(codename: string | null | undefined): boolean {
    if (!codename) return false;
    return codename === 'athena' || codename.startsWith('athena-');
}

/**
 * Hook — returns the scope derived from the current UI state:
 *   - If a cosmos-logos agent is selected (activeChatAgentId), that wins.
 *   - Otherwise, fall through to the built-in active agent (cosmos/logos/...).
 * History and Memory both subscribe to this one source of truth; switching
 * the top-of-screen AgentPicker re-filters both pages.
 */
export function useActiveAgentScope(): AgentScope {
    const builtin = useAgentStore((s) => s.activeAgent);
    const cosmosActiveId = useCosmosLogosStore((s) => s.activeChatAgentId);
    const cosmosAgents = useCosmosLogosStore((s) => s.agents);
    const cosmosAgent = cosmosActiveId
        ? cosmosAgents.find((a) => a.id === cosmosActiveId) ?? null
        : null;

    // Compute primitive inputs first (these are value-stable across renders),
    // then memoize the scope object on those primitives so React.useCallback /
    // React.useEffect deps referencing the scope don't re-fire every render.
    const builtinId = builtin.id;
    const builtinName = builtin.name;
    const builtinIcon = builtin.icon;
    const cosmosId = cosmosAgent?.id ?? null;
    const cosmosCodename = cosmosAgent?.manifest.identity.codename ?? null;
    const cosmosDisplayName = cosmosAgent ? agentDisplayName(cosmosAgent) : null;
    const cosmosColor = cosmosAgent?.manifest.display?.color ?? null;

    return useMemo<AgentScope>(() => {
        if (cosmosId && cosmosCodename) {
            if (isAthenaFamily(cosmosCodename)) {
                return {
                    key: 'athena',
                    displayName: 'Athena',
                    avatar: '🐙',
                    color: cosmosColor ?? '#a87ef0',
                    greeting: ATHENA_GREETING,
                    cta: ATHENA_CTA,
                    matches: (id) => !!id && isAthenaFamily(id),
                    toQueryParams: () => {
                        const p = new URLSearchParams();
                        p.set('agentIds', 'athena');
                        p.set('agentIdPrefix', 'athena-');
                        return p;
                    },
                    kind: 'athena',
                };
            }
            // Other cosmos agents (poseidon, thoth, etc.) — exact match on cosmos id
            const name = cosmosDisplayName ?? 'Agent';
            return {
                key: `cosmos:${cosmosId}`,
                displayName: name,
                avatar: name.charAt(0).toUpperCase(),
                color: cosmosColor ?? '#6366f1',
                greeting: DEFAULT_GREETING,
                cta: DEFAULT_CTA,
                matches: (id) => id === cosmosId,
                toQueryParams: () => {
                    const p = new URLSearchParams();
                    p.set('agentIds', cosmosId);
                    return p;
                },
                kind: 'cosmos',
            };
        }

        // Built-in agent (cosmos, logos, or BYOK — BYOK is beta-only)
        const greeting = builtinId === 'cosmos' ? COSMOS_GREETING
            : builtinId === 'logos' ? LOGOS_GREETING
            : DEFAULT_GREETING;
        const cta = builtinId === 'cosmos' ? COSMOS_CTA
            : builtinId === 'logos' ? LOGOS_CTA
            : DEFAULT_CTA;
        return {
            key: `builtin:${builtinId}`,
            displayName: builtinName,
            avatar: builtinIcon || builtinName.charAt(0).toUpperCase(),
            color: '#6366f1',
            greeting,
            cta,
            matches: (agentId) => agentId === builtinId,
            toQueryParams: () => {
                const p = new URLSearchParams();
                p.set('agentIds', builtinId);
                return p;
            },
            kind: 'builtin',
        };
    }, [cosmosId, cosmosCodename, cosmosDisplayName, cosmosColor, builtinId, builtinName, builtinIcon]);
}
