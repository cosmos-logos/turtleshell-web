export interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  capabilities: AgentCapability[];
  requiredServices: string[];
  repositoryUrl?: string;
}

export type AgentCapability =
  | 'chat'
  | 'mcp'
  | 'reasoning'
  | 'voice'
  | 'code'
  | 'search';
