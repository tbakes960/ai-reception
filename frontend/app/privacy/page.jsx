export const metadata = { title: 'Privacy Policy — Rehema AI' };

export default function PrivacyPolicy() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-gray-200">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: 19 May 2026</p>

      <Section title="1. Who We Are">
        Rehema AI (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is a SaaS platform that provides AI-powered voice
        receptionist services to hotels. Our registered address and data controller contact:
        <br /><br />
        <strong>Email:</strong> tabekah@yahoo.co.uk
      </Section>

      <Section title="2. Data We Collect">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account data:</strong> hotel name, admin email, password hash (bcrypt, never plaintext).</li>
          <li><strong>Guest data:</strong> name, phone, email, booking history, call transcripts — collected on behalf of your hotel (you are the data controller for this data).</li>
          <li><strong>Call recordings / transcripts:</strong> stored for 90 days then automatically purged.</li>
          <li><strong>Usage data:</strong> API request logs retained 30 days for debugging.</li>
          <li><strong>Payment data:</strong> processed by PayPal. We store only subscription status and PayPal subscription IDs — no card numbers.</li>
        </ul>
      </Section>

      <Section title="3. Legal Basis (GDPR)">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Contract performance</strong> — to deliver the subscription service.</li>
          <li><strong>Legitimate interest</strong> — fraud prevention, security monitoring.</li>
          <li><strong>Consent</strong> — marketing communications (opt-in only).</li>
        </ul>
      </Section>

      <Section title="4. Data Sharing">
        We share data with the following sub-processors:
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Railway (database hosting) — EU/US</li>
          <li>Twilio (voice calls, SMS) — US</li>
          <li>Anthropic (AI inference) — US</li>
          <li>ElevenLabs (text-to-speech) — US</li>
          <li>Deepgram (speech-to-text) — US</li>
          <li>PayPal (payment processing) — US</li>
        </ul>
        Transfers outside the EEA are covered by Standard Contractual Clauses or adequacy decisions.
      </Section>

      <Section title="5. Data Retention">
        <ul className="list-disc pl-5 space-y-1">
          <li>Call transcripts: 90 days.</li>
          <li>Guest profiles: retained while your subscription is active; deleted 30 days after cancellation on request.</li>
          <li>Account data: deleted within 30 days of account closure on written request.</li>
        </ul>
      </Section>

      <Section title="6. Your Rights">
        Under GDPR you have the right to: access, rectification, erasure (&quot;right to be forgotten&quot;),
        restriction, portability, and objection. Submit requests to{' '}
        <a href="mailto:tabekah@yahoo.co.uk" className="text-blue-400 underline">tabekah@yahoo.co.uk</a>.
        We will respond within 30 days.
      </Section>

      <Section title="7. Cookies">
        We use only functional cookies required for authentication (JWT session). No advertising or
        tracking cookies. See our <a href="/cookies" className="text-blue-400 underline">Cookie Policy</a>.
      </Section>

      <Section title="8. Security">
        All data is encrypted in transit (TLS 1.2+) and at rest. Passwords are hashed with bcrypt
        (cost 12). We conduct periodic security reviews.
      </Section>

      <Section title="9. Changes">
        We will notify subscribers by email at least 14 days before material changes take effect.
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
