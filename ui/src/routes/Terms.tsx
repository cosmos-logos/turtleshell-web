import { Link } from 'react-router-dom';

export function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-12 pb-6 border-b border-border-muted">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Terms &amp; Conditions</h1>
        <p className="text-sm text-text-muted">Effective Date: February 6, 2026</p>
      </div>

      <article className="space-y-9">
        <section>
          <h2 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            By accessing or using TurtleShell.ai (the &quot;Service&quot;), provided by CloudPremise LLC (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;), you agree to be bound by these Terms and Conditions. If you do not agree, do not use the Service.
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">
            The Service includes the TurtleShell.ai web application, iOS application, and associated APIs and backend infrastructure (collectively, the &quot;Platform&quot;).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">2. Description of Service</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            TurtleShell.ai is an AI-powered assistant platform that enables users to:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-text-secondary leading-relaxed">
            <li>Interact with AI agents powered by the Athena LLM backend</li>
            <li>Connect enterprise services (including but not limited to Salesforce, GitHub, HubSpot, Google Calendar, Workday, and Slack) through the Model Context Protocol (MCP)</li>
            <li>Manage service connections, credentials, and configurations</li>
            <li>Access AI-assisted workflows across connected services</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">3. User Accounts and Registration</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            You may be required to create an account to access certain features. You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. You agree to notify us immediately of any unauthorized access.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">4. Connected Services and OAuth Authorization</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            When you connect third-party services through TurtleShell.ai:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-text-secondary leading-relaxed">
            <li>You authorize TurtleShell.ai to access your data on those services within the scopes you approve during the OAuth authorization flow</li>
            <li>OAuth tokens and credentials are stored securely using industry-standard encryption (Keychain on iOS, encrypted server-side storage on web)</li>
            <li>You may revoke access at any time by disconnecting the service within the Platform or revoking permissions directly in the third-party service</li>
            <li>We do not store or have access to your third-party service passwords</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">5. Subscriptions and Billing</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            Certain features of the Service require a paid subscription. Subscriptions are managed through Apple&apos;s App Store (for iOS) or our web-based billing system. By subscribing, you agree to recurring charges at the rate displayed at the time of purchase. You may cancel at any time; cancellations take effect at the end of the current billing period.
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">
            Credits are granted as part of your subscription and are consumed when using AI-powered features with connected services. Unused credits do not roll over between billing periods.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">6. Acceptable Use</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            You agree not to:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-text-secondary leading-relaxed">
            <li>Use the Service for any unlawful purpose or in violation of any applicable law</li>
            <li>Attempt to gain unauthorized access to other users&apos; accounts or data</li>
            <li>Interfere with or disrupt the Service or its infrastructure</li>
            <li>Reverse engineer, decompile, or attempt to extract the source code of the Service</li>
            <li>Use the Service to transmit malware, spam, or other harmful content</li>
            <li>Circumvent access controls, rate limits, or subscription requirements</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">7. Intellectual Property</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            The Service, including its design, code, documentation, and branding, is the property of CloudPremise LLC and is protected by intellectual property laws. The Service is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0) where applicable. You retain ownership of all data and content you provide or generate through the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">8. AI-Generated Content</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Content generated by AI agents through the Service is provided &quot;as is&quot; and should not be considered professional, legal, medical, or financial advice. You are responsible for reviewing and validating AI-generated content before acting on it. We do not guarantee the accuracy, completeness, or reliability of AI-generated responses.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">9. Data and Privacy</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Your use of the Service is subject to our{' '}
            <Link to="/privacy" className="text-shell-400 hover:underline">
              Privacy Policy
            </Link>
            . We are committed to protecting your data and maintaining transparency about our data practices.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">10. Limitation of Liability</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, CLOUDPREMISE LLC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID BY YOU FOR THE SERVICE IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO LIABILITY.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">11. Disclaimer of Warranties</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">12. Modifications</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            We reserve the right to modify these Terms at any time. Material changes will be communicated through the Service or via email. Continued use after modifications constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">13. Termination</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            We may suspend or terminate your access to the Service at any time for violation of these Terms. Upon termination, your right to use the Service ceases, but sections that by their nature should survive termination will continue to apply.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">14. Governing Law</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            These Terms are governed by the laws of the State of Colorado, United States, without regard to conflict of law principles. Any disputes arising from these Terms shall be resolved in the state or federal courts located in Colorado.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">15. Contact</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            For questions about these Terms, contact us at:
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">
            CloudPremise LLC
            <br />
            Email:{' '}
            <a href="mailto:legal@cloudpremise.com" className="text-shell-400 hover:underline">
              legal@cloudpremise.com
            </a>
          </p>
        </section>
      </article>
    </div>
  );
}
