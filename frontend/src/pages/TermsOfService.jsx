import { Link } from 'react-router-dom'
import BudgetBuddyLogo from '../components/BudgetBuddyLogo'

const EFFECTIVE_DATE = 'June 15, 2026'
const CONTACT_EMAIL = 'support@budget-buddy-app.com'

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-gray-600">{children}</div>
    </section>
  )
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex flex-col items-center mb-8">
          <Link to="/login" aria-label="BudgetBuddy home">
            <BudgetBuddyLogo variant="stacked" size="lg" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-10 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Terms of Service</h1>
          <p className="text-xs text-gray-400 mb-8">Effective date: {EFFECTIVE_DATE}</p>

          <p className="text-sm leading-relaxed text-gray-600 mb-8">
            These Terms of Service ("Terms") govern your access to and use of BudgetBuddy ("BudgetBuddy",
            "we", "us", or "the service"), the personal finance application available at{' '}
            <span className="font-medium text-gray-700">budget-buddy-app.com</span>. Please read these
            Terms carefully. They form a binding legal agreement between you and BudgetBuddy.
          </p>

          <Section title="1. Acceptance of Terms">
            <p>
              By creating an account, accessing, or using BudgetBuddy, you agree to be bound by these Terms
              and by our{' '}
              <Link to="/privacy" className="text-emerald-600 font-medium hover:underline">Privacy Policy</Link>,
              which is incorporated here by reference. If you do not agree to these Terms, you must not use
              the service. If you are using BudgetBuddy on behalf of someone else, you represent that you are
              authorized to accept these Terms on their behalf.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              BudgetBuddy is a personal finance tracking web application designed for individuals and couples
              to record transactions, set budgets, track income, manage savings goals, and work toward shared
              financial goals. All financial data in the app is entered manually by you — BudgetBuddy does not
              connect to your bank or financial institutions.
            </p>
            <p>
              The service is offered in two tiers: a{' '}
              <span className="font-medium text-gray-700">free tier</span> with core budgeting features, and a
              paid <span className="font-medium text-gray-700">Pro tier</span> with additional features. We may
              add, modify, or remove features over time as the service evolves.
            </p>
          </Section>

          <Section title="3. User Accounts">
            <p>
              To use BudgetBuddy you must create an account with a valid email address. You are responsible for
              maintaining the confidentiality of your account credentials and for all activity that occurs under
              your account. You agree to provide accurate information and to keep it up to date.
            </p>
            <p>
              You must notify us promptly at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-600 font-medium hover:underline">
                {CONTACT_EMAIL}
              </a>{' '}
              if you believe your account has been accessed without your authorization. We are not liable for any
              loss arising from unauthorized use of your account where you failed to safeguard your credentials.
            </p>
          </Section>

          <Section title="4. Acceptable Use">
            <p>When using BudgetBuddy, you agree that you will not:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Use the service for any unlawful purpose or in violation of any applicable law or regulation.</li>
              <li>Scrape, crawl, harvest, or use automated means to access or extract data from the service.</li>
              <li>Attempt to gain unauthorized access to the service, other users' accounts, or our systems or networks.</li>
              <li>Probe, scan, or test the vulnerability of the service, or breach or circumvent any security or authentication measures.</li>
              <li>Interfere with, disrupt, or place an unreasonable load on the service or its infrastructure.</li>
              <li>Reverse engineer, decompile, or attempt to derive the source code of the service, except where permitted by law.</li>
              <li>Resell, sublicense, or otherwise commercially exploit the service without our prior written consent.</li>
            </ul>
          </Section>

          <Section title="5. Subscription and Billing">
            <p>
              The Pro tier is offered as a subscription at{' '}
              <span className="font-medium text-gray-700">$4.99 per month</span>. Payments are processed securely
              by <span className="font-medium text-gray-700">Stripe</span>, our third-party payment processor;
              your card details are entered directly on Stripe and are never seen by or stored on our servers.
            </p>
            <p>
              Your subscription renews automatically each month until cancelled. You may{' '}
              <span className="font-medium text-gray-700">cancel anytime</span>, and your Pro access will continue
              through the end of the current billing period. Payments are{' '}
              <span className="font-medium text-gray-700">non-refundable</span>, and we do not provide refunds or
              credits for partial months, unused time, or periods during which your account remained open but
              unused, except where required by law.
            </p>
            <p>
              Prices are <span className="font-medium text-gray-700">subject to change</span>. If we change the
              price of a subscription, we will provide advance notice, and the new price will apply to your next
              billing period after the notice. Your continued use of the Pro tier after a price change takes
              effect constitutes acceptance of the new price.
            </p>
          </Section>

          <Section title="6. Free Tier">
            <p>
              The free tier is provided <span className="font-medium text-gray-700">"as is"</span> and at no cost.
              We reserve the right to change the features, functionality, or limits of the free tier at any time,
              including introducing or adjusting usage limits, with or without notice. We do not guarantee that
              any particular free feature will remain available indefinitely.
            </p>
          </Section>

          <Section title="7. Data and Privacy">
            <p>
              Your use of BudgetBuddy is also governed by our{' '}
              <Link to="/privacy" className="text-emerald-600 font-medium hover:underline">Privacy Policy</Link>,
              which explains what information we collect and how we handle it. We{' '}
              <span className="font-medium text-gray-700">do not sell your data</span>. The financial data you
              enter <span className="font-medium text-gray-700">is yours</span> — you may access, edit, export
              where supported, and delete it at any time. Deleting your account permanently removes your data as
              described in the Privacy Policy.
            </p>
          </Section>

          <Section title="8. Shared Accounts">
            <p>
              BudgetBuddy allows couples and partners to share an account so they can view and manage the same
              transactions, budgets, income, savings, and shared goals. This data sharing is{' '}
              <span className="font-medium text-gray-700">by design</span>: anyone you invite to your account will
              be able to see and modify the shared financial data on that account.
            </p>
            <p>
              You are <span className="font-medium text-gray-700">solely responsible for who you invite</span> and
              for managing access to your shared account. Only invite people you trust with your financial
              information. We are not responsible for actions taken by anyone you have granted access to your
              account.
            </p>
          </Section>

          <Section title="9. Disclaimer of Warranties">
            <p>
              The service is provided <span className="font-medium text-gray-700">"as is" and "as available"</span>{' '}
              without warranties of any kind, whether express or implied, including but not limited to implied
              warranties of merchantability, fitness for a particular purpose, and non-infringement.
            </p>
            <p>
              We do not warrant that the service will be uninterrupted, timely, secure, or error-free, or that
              the information, calculations, or results obtained through the service will be accurate or reliable.
              You use the service at your own risk.
            </p>
          </Section>

          <Section title="10. Limitation of Liability">
            <p>
              BudgetBuddy is a tool to help you track and organize your finances. It is{' '}
              <span className="font-medium text-gray-700">not financial, investment, tax, or legal advice</span>.
              You are responsible for your own financial decisions, and you should consult a qualified
              professional before making important financial choices.
            </p>
            <p>
              To the fullest extent permitted by law, BudgetBuddy and its operators will not be liable for any
              indirect, incidental, special, consequential, or punitive damages, or for any loss arising from
              financial decisions made based on data, calculations, or information in the app. To the extent we
              are found liable, our total aggregate liability will not exceed the greater of the amount you paid
              us in the twelve months preceding the claim or USD $50.
            </p>
          </Section>

          <Section title="11. Termination">
            <p>
              We may suspend or terminate your access to the service, with or without notice, if you violate these
              Terms or use the service in a way that could cause harm to us, other users, or third parties.
            </p>
            <p>
              You may <span className="font-medium text-gray-700">delete your account at any time</span> from the
              Settings page, which permanently removes your data as described in the Privacy Policy. If you have a
              paid subscription, deleting your account or cancelling does not entitle you to a refund for the
              current billing period.
            </p>
          </Section>

          <Section title="12. Changes to These Terms">
            <p>
              We may update these Terms from time to time. When we make material changes, we will notify users by
              email and update the "Effective date" at the top of this page. Your continued use of the service
              after changes take effect constitutes acceptance of the revised Terms. If you do not agree to the
              changes, you should stop using the service and may delete your account.
            </p>
          </Section>

          <Section title="13. Governing Law">
            <p>
              These Terms are governed by and construed in accordance with the laws of the{' '}
              <span className="font-medium text-gray-700">State of Florida</span>, United States, without regard
              to its conflict of law principles. You agree that any dispute arising out of or relating to these
              Terms or the service will be subject to the exclusive jurisdiction of the state and federal courts
              located in Florida.
            </p>
          </Section>

          <Section title="14. Contact">
            <p>If you have questions about these Terms, contact us at:</p>
            <p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-600 font-medium hover:underline">
                {CONTACT_EMAIL}
              </a>
            </p>
          </Section>

          <div className="pt-4 border-t border-gray-100">
            <Link to="/login" className="inline-flex items-center min-h-[44px] text-sm text-emerald-600 font-medium hover:underline">
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
