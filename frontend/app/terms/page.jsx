export const metadata = { title: 'Terms of Use — Rehema AI' };

export default function TermsOfUse() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-gray-200">
      <h1 className="text-3xl font-bold mb-2">Terms of Use</h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: 19 May 2026</p>

      <Section title="1. Acceptance">
        By registering for or using Rehema AI (&quot;Service&quot;), you agree to these Terms. If you
        do not agree, do not use the Service.
      </Section>

      <Section title="2. Description of Service">
        Rehema AI provides an AI-powered voice receptionist platform for hotels. The Service
        includes inbound call handling, booking management, CRM, outbound call campaigns, and
        a management dashboard.
      </Section>

      <Section title="3. Subscription and Billing">
        <ul className="list-disc pl-5 space-y-1">
          <li>Subscription is $29 USD/month, billed via PayPal.</li>
          <li>A 14-day free trial is available to new accounts.</li>
          <li>Subscriptions auto-renew unless cancelled before the renewal date.</li>
          <li>No refunds are issued for partial months unless required by law.</li>
        </ul>
      </Section>

      <Section title="4. Acceptable Use">
        You must not use the Service to:
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Make unsolicited calls to persons who have not consented.</li>
          <li>Collect data about minors under 16 without verifiable parental consent.</li>
          <li>Attempt to reverse-engineer, scrape, or resell the Service.</li>
          <li>Violate any applicable telecoms, data protection, or consumer protection law.</li>
        </ul>
      </Section>

      <Section title="5. Your Data">
        You retain ownership of all hotel and guest data you input into the Service. You grant us
        a limited licence to process that data solely to provide the Service. See our{' '}
        <a href="/privacy" className="text-blue-400 underline">Privacy Policy</a> and{' '}
        <a href="/dpa" className="text-blue-400 underline">Data Processing Agreement</a>.
      </Section>

      <Section title="6. AI Limitations">
        The AI receptionist may make errors. You are responsible for reviewing and verifying any
        bookings, commitments, or guest communications made through the Service. We are not liable
        for losses arising from AI errors.
      </Section>

      <Section title="7. Uptime and SLA">
        We target 99.5% monthly uptime excluding scheduled maintenance. No financial SLA credits
        are offered under the standard plan.
      </Section>

      <Section title="8. Termination">
        Either party may terminate at any time. On termination, your data is retained for 30 days
        then deleted unless you request an export.
      </Section>

      <Section title="9. Limitation of Liability">
        To the maximum extent permitted by law, our total liability to you for any claim shall not
        exceed the fees you paid in the 3 months preceding the claim.
      </Section>

      <Section title="10. Governing Law">
        These Terms are governed by the laws of Kenya. Disputes shall be resolved in the courts
        of Nairobi.
      </Section>

      <Section title="11. Contact">
        <a href="mailto:tabekah@yahoo.co.uk" className="text-blue-400 underline">tabekah@yahoo.co.uk</a>
      </Section>
    </main>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-white mb-3">{title}</h2>
      <div className="text-gray-300 leading-relaxed">{children}</div>
    </section>
  );
}
