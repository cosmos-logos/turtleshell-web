export interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  capabilities: AgentCapability[];
  requiredServices: string[];
  repositoryUrl?: string;
  systemPrompt?: string;
  voice?: {
    description?: string;
    engines: Record<string, { voice_id: string; model?: string; [key: string]: unknown }>;
    preferred_engine?: string;
  };
  /** Whether this agent appears in the sidebar and picker. Default true. */
  visible?: boolean;
  /** Pre-configured Athena endpoint URL for this agent (e.g. ngrok, cloud). */
  endpoint?: string;
}

export type AgentCapability =
  | 'chat'
  | 'mcp'
  | 'reasoning'
  | 'voice'
  | 'code'
  | 'search'
  | 'journal'
  | 'code_review'
  | 'assignments'
  | 'projects';
