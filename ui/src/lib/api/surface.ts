import { useEnvironmentStore } from '@/lib/store/environment-store';

/**
 * Surface key — names the *client surface* a request is coming from. AppKey
 * is shared across surfaces (one ApplicationProfile per user), so the
 * surface tag lives in `ClientVersion__c` on Feedback__c (matches the
 * existing iris-turtleshell pattern `iris-turtleshell/1.0.0`).
 *
 * Today the SPA bundle is loaded on:
 *   - turtleshell.ai (cloud)     → surface = 'turtleshell-web'
 *   - localhost dev fleet        → surface = 'turtleshell-web'
 *   - off-grid Mac appliance     → surface = 'turtleshell-mac'
 *
 * Linux/Windows offgrid installers don't ship yet; when they do, the SPA
 * can read /api/node-info from the local Express to differentiate. For
 * now offgrid == Mac, since `mac/scripts/postinstall` is the only
 * installer path.
 */
export function getSurface(): 'turtleshell-web' | 'turtleshell-mac' {
  const env = useEnvironmentStore.getState().current;
  return env === 'offgrid' ? 'turtleshell-mac' : 'turtleshell-web';
}

/** `surface/version` token, e.g. `turtleshell-mac/1.7.4`. Stamped into
 *  Feedback__c.ClientVersion__c so admins can filter feedback by surface
 *  without needing a separate column. */
export function clientVersionTag(version: string): string {
  return `${getSurface()}/${version}`;
}
