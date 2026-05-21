export const metadata = { title: 'Data Processing Agreement — Rehema AI' };

export default function DPA() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-gray-200">
      <h1 className="text-3xl font-bold mb-2">Data Processing Agreement (DPA)</h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: 19 May 2026</p>

      <p className="text-gray-300 mb-8">
        This DPA forms part of the Terms of Use between Rehema AI (&quot;Processor&quot;) and the
        subscribing hotel (&quot;Controller&quot;), and governs the processing of personal data in
        accordance with GDPR Article 28.
      </p>

      <Section title="1. Subject Matter and Duration">
        The Processor will process personal data on behalf of the Controller to provide the AI
        Reception service for the duration of the active subscription.
      </Section>

      <Section title="2. Nature and Purpose of Processing">
        Processing is necessary to:
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Answer inbound guest phone calls via AI voice receptionist.</li>
          <li>Store and retrieve guest profiles, booking history, and call transcripts.</li>
          <li>Send SMS, WhatsApp, and email communications to guests with consent.</li>
          <li>Conduct outbound follow-up calls to consenting guests.</li>
        </ul>
      </Section>

      <Section title="3. Categories of Data Subjects">
        Hotel guests (adults) and hotel staff/admin users.
      </Section>

      <Section title="4. Categories of Personal Data">
        Name, phone number, email address, booking details, call transcripts, sentiment analysis
        scores, and free-form notes added by hotel staff.
      </Section>

      <Section title="5. Processor Obligations">
        The Processor shall:
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Process data only on documented Controller instructions.</li>
          <li>Ensure persons authorised to process data are bound by confidentiality.</li>
          <li>Implement appropriate technical and organisational security measures.</li>
          <li>Assist the Controller with data subject rights requests within 30 days.</li>
          <li>Delete or return all personal data on termination of the service.</li>
          <li>Make available all information necessary to demonstrate compliance.</li>
        </ul>
      </Section>

      <Section title="6. Sub-processors">
        The Controller authorises use of the sub-processors listed in the{' '}
        <a href="/privacy#sub-processors" className="text-blue-400 underline">Privacy Policy</a>.
        The Processor will notify the Controller at least 14 days before adding new sub-processors.
      </Section>

      <Section title="7. International Transfers">
        Where data is transferred outside the EEA, the Processor shall ensure adequate safeguards
        are in place (e.g., Standard Contractual Clauses with each sub-processor).
      </Section>

      <Section title="8. Security Measures">
        <ul className="list-disc pl-5 space-y-1">
          <li>TLS 1.2+ encryption in transit.</li>
          <li>AES-256 encryption at rest (Railway managed).</li>
          <li>Role-based access control; staff users cannot access medical notes.</li>
          <li>bcrypt password hashing (cost factor 12).</li>
          <li>Automated anomaly alerting via Sentry.</li>
        </ul>
      </Section>

      <Section title="9. Data Breach Notification">
        The Processor shall notify the Controller within 72 hours of becoming aware of a personal
        data breach.
      </Section>

      <Section title="10. Contact">
        DPA enquiries:{' '}
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
