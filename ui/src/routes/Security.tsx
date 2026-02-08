export function Security() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-12 pb-6 border-b border-border-muted">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Security</h1>
        <p className="text-sm text-text-muted">Last Updated: February 6, 2026</p>
      </div>

      <article className="space-y-9">
        <section>
          <h2 className="text-lg font-semibold mb-3">Security Architecture Overview</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            TurtleShell.ai is built with security as a foundational principle. Our architecture ensures that your enterprise credentials and data are protected at every layer.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Authentication &amp; Authorization</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            <strong className="text-text-primary">OAuth 2.0 with PKCE:</strong> All enterprise service connections use the Proof Key for Code Exchange (PKCE) extension of OAuth 2.0. This prevents authorization code interception attacks and is the industry standard for public clients.
          </p>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            <strong className="text-text-primary">No Password Storage:</strong> TurtleShell.ai never stores your third-party service passwords. Authentication is handled through secure OAuth flows, and only access/refresh tokens are retained.
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">
            <strong className="text-text-primary">Token Management:</strong> Access tokens are short-lived and automatically refreshed. Refresh tokens are stored encrypted and can be revoked at any time through the Service Registry.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Credential Storage</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            We use platform-appropriate secure storage for all sensitive data:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-text-secondary leading-relaxed">
            <li>
              <strong className="text-text-primary">iOS:</strong> Apple Keychain with{' '}
              <code className="px-1.5 py-0.5 bg-surface-2 rounded text-xs font-mono text-text-primary">
                kSecAttrAccessibleAfterFirstUnlock
              </code>{' '}
              protection level, backed by the Secure Enclave
            </li>
            <li>
              <strong className="text-text-primary">Web:</strong> HttpOnly secure cookies for session tokens; OAuth credentials stored server-side with AES-256-GCM encryption at rest
            </li>
            <li>
              <strong className="text-text-primary">Non-sensitive metadata</strong> (service names, configuration) is stored separately from credentials
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Data in Transit</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            All communications are encrypted:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-text-secondary leading-relaxed">
            <li>TLS 1.3 for all API communications</li>
            <li>Certificate pinning on iOS for connections to Olympus-Grid infrastructure</li>
            <li>HSTS headers enforced on all web endpoints</li>
            <li>MCP headers (containing OAuth tokens for connected services) are transmitted over encrypted channels exclusively</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Infrastructure</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            TurtleShell.ai backend (Athena LLM) runs on Olympus-Grid infrastructure:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-text-secondary leading-relaxed">
            <li>Hosted on AWS with CloudFront edge distribution</li>
            <li>WAFv2 protection against common web exploits</li>
            <li>IP allowlisting available for enterprise deployments</li>
            <li>Infrastructure-as-Code (CDK) for auditable, repeatable deployments</li>
            <li>Separate environments for development, staging, and production</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Access Control</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            The Platform implements multi-layered access control:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-text-secondary leading-relaxed">
            <li><strong className="text-text-primary">Subscription Gate:</strong> Premium features require active subscription verification</li>
            <li><strong className="text-text-primary">Credit Gate:</strong> AI-powered service interactions consume metered credits</li>
            <li><strong className="text-text-primary">Service-Level Auth:</strong> Each connected service maintains its own authorization scope</li>
            <li><strong className="text-text-primary">Enforcement Points:</strong> Access checks occur at the network layer (before API calls), the service layer (before credential use), and the UI layer (before user interaction)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Model Context Protocol (MCP) Security</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            MCP enables AI agents to interact with your connected services. Security considerations include:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-text-secondary leading-relaxed">
            <li>MCP headers are only attached to requests when a service is actively connected and authorized</li>
            <li>The AI agent can only access services you&apos;ve explicitly connected and within the OAuth scopes you&apos;ve approved</li>
            <li>Service credentials are forwarded to the backend but never exposed in AI responses</li>
            <li>All MCP interactions are logged and auditable</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Incident Response</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            In the event of a security incident:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-text-secondary leading-relaxed">
            <li>Affected users will be notified within 72 hours</li>
            <li>Compromised tokens will be immediately revoked</li>
            <li>A post-incident report will be published</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Reporting Vulnerabilities</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            We take security seriously and appreciate responsible disclosure. If you discover a security vulnerability, please contact us at:
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">
            Email:{' '}
            <a href="mailto:security@cloudpremise.com" className="text-shell-400 hover:underline">
              security@cloudpremise.com
            </a>
            <br />
            Please include a description of the vulnerability, steps to reproduce, and your contact information.
          </p>
        </section>
      </article>
    </div>
  );
}
