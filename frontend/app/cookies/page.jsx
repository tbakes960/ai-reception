export const metadata = { title: 'Cookie Policy — Rehema AI' };

export default function CookiePolicy() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-gray-200">
      <h1 className="text-3xl font-bold mb-2">Cookie Policy</h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: 19 May 2026</p>

      <Section title="1. What Are Cookies">
        Cookies are small text files stored in your browser. They help websites remember your
        preferences and keep you logged in.
      </Section>

      <Section title="2. Cookies We Use">
        <table className="w-full text-sm border-collapse mt-2">
          <thead>
            <tr className="text-left border-b border-gray-600">
              <th className="py-2 pr-4">Cookie</th>
              <th className="py-2 pr-4">Purpose</th>
              <th className="py-2 pr-4">Duration</th>
              <th className="py-2">Type</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            <tr className="border-b border-gray-700">
              <td className="py-2 pr-4 font-mono">ai_reception_token</td>
              <td className="py-2 pr-4">Keeps you logged into the dashboard</td>
              <td className="py-2 pr-4">7 days</td>
              <td className="py-2">Strictly necessary</td>
            </tr>
            <tr className="border-b border-gray-700">
              <td className="py-2 pr-4 font-mono">cookie_consent</td>
              <td className="py-2 pr-4">Remembers your cookie preference</td>
              <td className="py-2 pr-4">1 year</td>
              <td className="py-2">Strictly necessary</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-4">
          We do <strong>not</strong> use advertising, analytics, or third-party tracking cookies.
        </p>
      </Section>

      <Section title="3. Managing Cookies">
        You can delete or block cookies in your browser settings. Blocking the session cookie will
        prevent you from staying logged in. No other functionality is affected.
      </Section>

      <Section title="4. Changes">
        We will update this policy if we add new cookies. Changes are effective on the date shown
        at the top.
      </Section>

      <Section title="5. Contact">
        Questions? Email{' '}
        <a href="mailto:tabekah@yahoo.co.uk" className="text-blue-400 underline">tabekah@yahoo.co.uk</a>.
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
