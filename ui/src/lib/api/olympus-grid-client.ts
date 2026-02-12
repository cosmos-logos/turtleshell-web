import { useEnvironmentStore } from '@/lib/store/environment-store';
import type { OlympusUser, CaseRecord } from '@/types/service';

const DEVELOPER_KEY = 'ts-web-int-2026';

async function authenticatedFetch(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const gatewayUrl = useEnvironmentStore.getState().getGatewayUrl();
  const url = `${gatewayUrl}${path}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-developer-key': DEVELOPER_KEY,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Request failed ${response.status}: ${body || response.statusText}`);
  }

  const json = await response.json();

  if (json.error) {
    throw new Error(json.error);
  }

  return json.result;
}

export async function requestMagicLink(
  email: string,
): Promise<{ requestId: string; expiresIn: number }> {
  const result = await authenticatedFetch('/v1/auth/web/email/link/request', {
    method: 'POST',
    body: JSON.stringify({
      email,
      clientId: 'turtleshell-web',
      callbackUrl: window.location.origin + '/auth/callback',
    }),
  });
  return result as { requestId: string; expiresIn: number };
}

export async function verifyCode(
  code: string,
  requestId: string,
): Promise<OlympusUser> {
  const result = await authenticatedFetch('/v1/auth/web/email/link/verify', {
    method: 'POST',
    body: JSON.stringify({
      code: code.toUpperCase().trim(),
      requestId,
    }),
  });
  return (result as { user: OlympusUser }).user;
}

export async function listCases(): Promise<CaseRecord[]> {
  const result = await authenticatedFetch('/v1/servicedesk/sfcase');
  return result as CaseRecord[];
}

export async function createCase(
  subject: string,
  description: string,
): Promise<{ id: string; caseNumber: string }> {
  const result = await authenticatedFetch('/v1/servicedesk/sfcase', {
    method: 'POST',
    body: JSON.stringify({ subject, description }),
  });
  const records = result as CaseRecord[];
  const created = records[0];
  if (!created) throw new Error('No case returned from server');
  return { id: created.Id, caseNumber: created.CaseNumber };
}
