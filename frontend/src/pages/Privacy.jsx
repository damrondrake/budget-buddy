import { Link } from 'react-router-dom'
import BudgetBuddyLogo from '../components/BudgetBuddyLogo'

const LAST_UPDATED = 'June 4, 2026'
const CONTACT_EMAIL = 'privacy@budget-buddy-app.com'

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-gray-600">{children}</div>
    </section>
  )
}

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex flex-col items-center mb-8">
          <Link to="/login" aria-label="BudgetBuddy home">
            <BudgetBuddyLogo variant="stacked" size="lg" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-10 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Privacy Policy</h1>
          <p className="text-xs text-gray-400 mb-8">Last updated: {LAST_UPDATED}</p>

          <p className="text-sm leading-relaxed text-gray-600 mb-8">
            BudgetBuddy ("we", "us", or "the service") is a personal budgeting application that helps
            you track your transactions, budgets, income, and savings goals. This policy explains what
            information we collect, how we use it, where it is stored, and the rights you have over your
            data. We've written it in plain language because your privacy matters to us.
          </p>

          <Section title="1. Information We Collect">
            <p>We collect only the information needed to provide the budgeting service:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><span className="font-medium text-gray-700">Account information</span> — your email address and display name, which you provide when you register.</li>
              <li><span className="font-medium text-gray-700">Financial transaction data</span> — the expenses you record, including amounts, dates, categories, notes, and who paid.</li>
              <li><span className="font-medium text-gray-700">Budget data</span> — the monthly budgets and line items you create for each category.</li>
              <li><span className="font-medium text-gray-700">Income data</span> — the income entries you record, including amounts and sources.</li>
              <li><span className="font-medium text-gray-700">Savings data</span> — your savings goals, allocations, and deposit/withdrawal history.</li>
            </ul>
            <p>
              We do <span className="font-medium text-gray-700">not</span> collect bank credentials, connect
              to your financial institutions, or process payments. All financial data is entered manually by you.
            </p>
          </Section>

          <Section title="2. Where Your Data Is Stored">
            <p>
              Your data is stored in a PostgreSQL database hosted on{' '}
              <span className="font-medium text-gray-700">Railway</span>, with infrastructure located in the{' '}
              <span className="font-medium text-gray-700">United States</span>. Passwords are never stored in
              plain text — they are hashed using the industry-standard bcrypt algorithm before being saved.
            </p>
          </Section>

          <Section title="3. How We Use Your Data">
            <p>
              We use your data <span className="font-medium text-gray-700">solely to provide the budgeting
              service</span> — to display your dashboard, calculate totals and trends, manage your budgets and
              savings, and (if you choose) share an account with a partner.
            </p>
            <p>
              We <span className="font-medium text-gray-700">never sell your data</span>, and we{' '}
              <span className="font-medium text-gray-700">never share it with third parties</span> for
              advertising, marketing, or any other purpose. There are no advertising trackers or analytics
              profiles built from your financial activity.
            </p>
          </Section>

          <Section title="4. Your Rights and Choices">
            <p>You are in control of your data at all times. You can:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Access and edit your transactions, budgets, income, and savings at any time within the app.</li>
              <li>Update your display name and email-related settings.</li>
              <li>
                <span className="font-medium text-gray-700">Permanently delete your account and all associated
                data</span> at any time from the Settings page. This action immediately and irreversibly removes
                your account, transactions, budgets, income, savings, categories, and all other data we hold for
                you.
              </li>
            </ul>
          </Section>

          <Section title="5. GDPR Compliance (EU/EEA Users)">
            <p>
              If you are located in the European Union or European Economic Area, you have rights under the
              General Data Protection Regulation (GDPR), including the right to access, rectify, port, and erase
              your personal data, and the right to restrict or object to its processing.
            </p>
            <p>
              The lawful basis for our processing is the performance of our service to you. You can exercise your
              right to erasure ("right to be forgotten") directly using the "Delete My Account" option in
              Settings, or by contacting us at the address below. We will respond to verified requests within 30
              days.
            </p>
          </Section>

          <Section title="6. CCPA Compliance (California Users)">
            <p>
              If you are a California resident, the California Consumer Privacy Act (CCPA) gives you the right to
              know what personal information we collect, the right to request its deletion, and the right not to
              be discriminated against for exercising these rights.
            </p>
            <p>
              Because we do not sell personal information, there is no "Do Not Sell My Personal Information"
              action required. You may request deletion of your information at any time using the "Delete My
              Account" option in Settings or by contacting us.
            </p>
          </Section>

          <Section title="7. Cookies and Local Storage">
            <p>
              BudgetBuddy does <span className="font-medium text-gray-700">not use tracking cookies</span> and
              does not use third-party advertising or analytics cookies of any kind.
            </p>
            <p>
              We use your browser's <span className="font-medium text-gray-700">localStorage</span> to store your
              authentication token (and a cached copy of your account profile) so you stay signed in between
              visits. This is essential to the operation of the service and is never used for tracking. Signing
              out or deleting your account clears this data from your browser.
            </p>
          </Section>

          <Section title="8. Data Retention">
            <p>
              We retain your data for as long as your account is active. When you delete your account, all
              associated data is removed from our database immediately. We do not keep backups of deleted
              accounts beyond what is required for routine, time-limited infrastructure backups, which age out
              automatically.
            </p>
          </Section>

          <Section title="9. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated"
              date at the top of this page. Significant changes will be communicated within the app where
              appropriate.
            </p>
          </Section>

          <Section title="10. Contact Us">
            <p>
              If you have questions about this policy or wish to exercise any of your privacy rights, contact us
              at:
            </p>
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
