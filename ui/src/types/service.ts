// ── Service Category Taxonomy (mirrors iOS ServiceCategory) ──

export type ServiceCategory =
  | 'reasoning'
  | 'crm'
  | 'sourceControl'
  | 'calendar'
  | 'communication'
  | 'storage'
  | 'database'
  | 'identity'
  | 'payment'
  | 'voice'
  | 'platform';

export type CRMProvider = 'salesforce' | 'hubspot';
export type SourceControlProvider = 'github' | 'gitlab' | 'bitbucket';
export type CalendarProvider = 'google' | 'outlook';
export type CommunicationProvider = 'slack' | 'discord' | 'teams';
export type PlatformProvider = 'olympus-grid';

export type ServiceProvider =
  | CRMProvider
  | SourceControlProvider
  | CalendarProvider
  | CommunicationProvider
  | PlatformProvider
  | string;

// ── Olympus-Grid Models ──

export interface OlympusUser {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
}

export interface CaseRecord {
  Id: string;
  CaseNumber: string;
  Subject: string;
  Description: string;
  Status: string;
  Priority: string;
  CreatedDate: string;
}

// ── Service Models ──

export interface ServiceCredentials {
  accessToken: string;
  refreshToken?: string;
  instanceUrl?: string;
  tokenExpiry?: number;
  clientId?: string;
  clientSecret?: string;
}

export interface ServiceMetadata {
  displayName: string;
  category: ServiceCategory;
  provider: ServiceProvider;
  environment?: 'production' | 'sandbox' | 'scratch' | 'custom';
  connectedAt: number;
  lastUsed?: number;
}

export interface RegisteredService extends ServiceMetadata {
  id: string;
  isConnected: boolean;
  credentials?: ServiceCredentials;
}

// ── Service Catalog ──

export interface ServiceDefinition {
  category: ServiceCategory;
  provider: ServiceProvider;
  label: string;
  description: string;
  icon: string;
  oauthSupported: boolean;
  status: 'available' | 'coming_soon';
}

export const SERVICE_CATALOG: ServiceDefinition[] = [
  {
    category: 'crm',
    provider: 'salesforce',
    label: 'Salesforce',
    description: 'Connect your Salesforce org for CRM data access via MCP',
    icon: '☁️',
    oauthSupported: true,
    status: 'available',
  },
  {
    category: 'sourceControl',
    provider: 'github',
    label: 'GitHub',
    description: 'Access repositories, issues, and pull requests',
    icon: '🐙',
    oauthSupported: true,
    status: 'available',
  },
  {
    category: 'crm',
    provider: 'hubspot',
    label: 'HubSpot',
    description: 'Connect HubSpot CRM for contacts, deals, and marketing',
    icon: '🟠',
    oauthSupported: true,
    status: 'available',
  },
  {
    category: 'calendar',
    provider: 'google',
    label: 'Google Calendar',
    description: 'Manage events, scheduling, and availability',
    icon: '📅',
    oauthSupported: true,
    status: 'available',
  },
  {
    category: 'communication',
    provider: 'slack',
    label: 'Slack',
    description: 'Send messages, search channels, and manage workflows',
    icon: '💬',
    oauthSupported: true,
    status: 'coming_soon',
  },
  {
    category: 'identity',
    provider: 'workday',
    label: 'Workday',
    description: 'HR and workforce management integration',
    icon: '💼',
    oauthSupported: false,
    status: 'available',
  },
  {
    category: 'platform',
    provider: 'olympus-grid',
    label: 'Olympus-Grid',
    description: 'Platform services — Service Desk, identity, and AI tools',
    icon: '🛡️',
    oauthSupported: false,
    status: 'available',
  },
];

// ── Errors ──

export type ServiceErrorType =
  | 'serviceNotFound'
  | 'noCredentials'
  | 'credentialsExpired'
  | 'authorizationCancelled'
  | 'authorizationFailed'
  | 'connectionTestFailed'
  | 'subscriptionRequired'
  | 'creditsRequired'
  | 'invalidConfiguration';
