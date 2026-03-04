import { Link } from 'react-router-dom';

export function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-12 pb-6 border-b border-border-muted">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-text-muted">Effective Date: February 6, 2026</p>
      </div>

      <article className="space-y-9">
        <section>
          <h2 className="text-lg font-semibold mb-3">1. Information We Collect</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            TurtleShell.ai collects the minimum information necessary to provide the Service:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-text-secondary leading-relaxed">
            <li><strong className="text-text-primary">Account Information:</strong> Email address and display name when you create an account</li>
            <li><strong className="text-text-primary">Usage Data:</strong> Anonymized analytics on feature usage, session duration, and error reports</li>
            <li><strong className="text-text-primary">OAuth Tokens:</strong> Access and refresh tokens for connected enterprise services, stored encrypted</li>
            <li><strong className="text-text-primary">Chat History:</strong> Conversation content between you and AI agents, stored for session continuity</li>
            <li><strong className="text-text-primary">Device Information:</strong> Device type, operating system version, and app version for compatibility and support</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">2. How We Use Your Information</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            We use collected information to:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-text-secondary leading-relaxed">
            <li>Provide and maintain the Service</li>
            <li>Authenticate you and manage your connected services</li>
            <li>Improve the Service through anonymized usage analytics</li>
            <li>Communicate service updates, security alerts, and support</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p className="text-sm text-text-secondary leading-relaxed mt-3">
            We do not sell your personal information to third parties. We do not use your data to train AI models.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">3. Third-Party Service Data</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            When you connect enterprise services (Salesforce, GitHub, etc.):
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-text-secondary leading-relaxed">
            <li>Data from those services is accessed in real-time during your conversations via MCP and is not persistently stored on our servers</li>
            <li>OAuth tokens are stored securely and used solely to facilitate your authorized requests</li>
            <li>We do not access or store your third-party service data beyond what is needed for the active session</li>
            <li>You can revoke access at any time through the Service Registry</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">4. Data Storage and Security</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            We implement industry-standard security measures:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-text-secondary leading-relaxed">
            <li>OAuth tokens and credentials are stored using iOS Keychain (mobile) and encrypted server-side storage (web)</li>
            <li>All data in transit is encrypted using TLS 1.3</li>
            <li>Backend infrastructure is hosted on AWS with enterprise-grade security controls</li>
            <li>Access to production systems is restricted and audited</li>
          </ul>
          <p className="text-sm text-text-secondary leading-relaxed mt-3">
            See our{' '}
            <Link to="/security" className="text-shell-400 hover:underline">
              Security page
            </Link>{' '}
            for detailed information about our security practices.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">5. Data Retention</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            We retain your data only as long as necessary:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-text-secondary leading-relaxed">
            <li><strong className="text-text-primary">Account data:</strong> Retained while your account is active, deleted within 30 days of account closure</li>
            <li><strong className="text-text-primary">Chat history:</strong> Retained for session continuity, configurable by user</li>
            <li><strong className="text-text-primary">OAuth tokens:</strong> Retained while the service connection is active, deleted immediately upon disconnection</li>
            <li><strong className="text-text-primary">Usage analytics:</strong> Anonymized data retained for up to 24 months</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">6. Your Rights</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            Depending on your jurisdiction, you may have the right to:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-text-secondary leading-relaxed">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Object to or restrict processing of your data</li>
            <li>Export your data in a portable format</li>
            <li>Withdraw consent at any time</li>
          </ul>
          <p className="text-sm text-text-secondary leading-relaxed mt-3">
            To exercise these rights, contact us at{' '}
            <a href="mailto:privacy@cloudpremise.com" className="text-shell-400 hover:underline">
              privacy@cloudpremise.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">7. Cookies and Tracking</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            The web application uses essential cookies for session management and authentication. We do not use third-party tracking cookies or advertising trackers. Analytics data is collected using privacy-respecting, first-party methods.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">8. Children&apos;s Privacy</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            TurtleShell.ai is not intended for use by individuals under the age of 13. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal information, we will take steps to delete it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">9. Changes to This Policy</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            We may update this Privacy Policy from time to time. Material changes will be communicated through the Service or via email. Your continued use of the Service after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">10. Contact</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            For privacy-related questions or requests:
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">
            CloudPremise LLC
            <br />
            Email:{' '}
            <a href="mailto:privacy@cloudpremise.com" className="text-shell-400 hover:underline">
              privacy@cloudpremise.com
            </a>
          </p>
        </section>
      </article>
    </div>
  );
}
