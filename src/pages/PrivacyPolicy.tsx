import { Link } from 'react-router-dom'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-[#16a34a] text-white py-6 px-4 shadow-lg">
        <div className="container mx-auto max-w-4xl flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <span className="text-3xl">🏈</span>
            <div>
              <h1 className="text-2xl font-bold leading-tight tracking-tight">SNPS Squares</h1>
            </div>
          </div>
          <Link
            to="/"
            className="border-2 border-white text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-sm font-bold hover:bg-white hover:text-[#16a34a] transition-all shadow-md hover:shadow-lg whitespace-nowrap"
          >
            Back to Board
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto max-w-4xl px-4 py-12">
        <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12">
          <h1 className="text-4xl font-bold text-[var(--color-primary)] mb-2">Privacy Policy</h1>
          <p className="text-sm text-[var(--color-text-muted)] mb-8">Last Updated: September 2026</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Introduction</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                Welcome to SNPS Squares. This Privacy Policy explains how we collect, use, disclose, and safeguard 
                your information when you use our Super Bowl squares board application. This service is operated as a 
                charitable fundraiser for SNPS (Sunday Night Pong Series) and is designed to support community causes 
                while providing entertainment during the Super Bowl.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-[var(--color-text)] mt-6 mb-3">Personal Information You Provide</h3>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">
                When you claim a square on our board, we collect:
              </p>
              <ul className="list-disc list-inside space-y-2 text-[var(--color-text)] ml-4">
                <li>Your name</li>
                <li>Your email address</li>
                <li>Square selection and claim timestamp</li>
              </ul>

              <h3 className="text-xl font-semibold text-[var(--color-text)] mt-6 mb-3">Administrator Information</h3>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">
                For authorized administrators:
              </p>
              <ul className="list-disc list-inside space-y-2 text-[var(--color-text)] ml-4">
                <li>Google account email address (for authentication)</li>
                <li>Session tokens and authentication cookies</li>
              </ul>

              <h3 className="text-xl font-semibold text-[var(--color-text)] mt-6 mb-3">Game Settings and Board Data</h3>
              <ul className="list-disc list-inside space-y-2 text-[var(--color-text)] ml-4">
                <li>Cost per square and charity donation percentage</li>
                <li>Game configuration (teams, status, quarter scores)</li>
                <li>Board state (randomized numbers, locked status)</li>
                <li>Payment tracking information (marked as paid or pending)</li>
              </ul>

              <h3 className="text-xl font-semibold text-[var(--color-text)] mt-6 mb-3">Automatically Collected Information</h3>
              <p className="text-[var(--color-text)] leading-relaxed">
                Our hosting provider (Supabase) may automatically collect certain technical information including 
                IP addresses, browser type, device information, and usage patterns. We do not directly access or 
                use this information for tracking purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">How We Use Your Information</h2>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-[var(--color-text)] ml-4">
                <li>Operate and display the Super Bowl squares board</li>
                <li>Track square claims and prevent duplicate claims</li>
                <li>Enable administrators to manage payment tracking</li>
                <li>Calculate charity donation totals and prize distributions</li>
                <li>Contact you about your squares or payment status if necessary</li>
                <li>Display leaderboards showing top buyers (name and square count only)</li>
                <li>Ensure only authorized administrators can access administrative functions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Information Sharing and Disclosure</h2>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">
                We do not sell, rent, or trade your personal information. Your information may be shared only in these limited circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 text-[var(--color-text)] ml-4">
                <li><strong>Public Display:</strong> Your first name and square count appear on the public board and Top Buyers leaderboard</li>
                <li><strong>Administrator Access:</strong> Authorized SNPS administrators can view claim details including names and emails for payment tracking purposes</li>
                <li><strong>Service Provider:</strong> We use Supabase as our database and authentication provider, subject to their privacy policy</li>
                <li><strong>Legal Requirements:</strong> We may disclose information if required by law or in response to valid legal requests</li>
              </ul>
              <p className="text-[var(--color-text)] leading-relaxed mt-4">
                <strong>Note:</strong> We do NOT process payments directly. All Venmo and cash payments are handled 
                off-platform between participants and the administrator. We do not store payment credentials or 
                financial account information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Cookies and Session Data</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                We use session cookies for administrator authentication only. These cookies are essential for the 
                service to function and allow administrators to remain logged in securely. Regular users (non-admins) 
                claiming squares do not require authentication and no tracking cookies are placed on their devices.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Data Retention</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                We retain board and claim data for the duration of each Super Bowl season and for archival purposes. 
                Historical data may be retained to support multi-season statistics and charity fundraising reporting. 
                You may request deletion of your personal information by contacting us at stecher2789@gmail.com.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Data Security</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                We implement appropriate technical and organizational security measures to protect your personal 
                information. Our database is hosted by Supabase with industry-standard encryption and access controls. 
                However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee 
                absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Children's Privacy</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                Our service is not directed to children under the age of 18. We do not knowingly collect personal 
                information from children. If you are a parent or guardian and believe your child has provided us 
                with personal information, please contact us so we can delete such information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Your California Privacy Rights</h2>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">
                If you are a California resident, you have certain rights under the California Consumer Privacy Act (CCPA):
              </p>
              <ul className="list-disc list-inside space-y-2 text-[var(--color-text)] ml-4">
                <li>Right to know what personal information we collect, use, and disclose</li>
                <li>Right to request deletion of your personal information</li>
                <li>Right to opt-out of the sale of personal information (note: we do not sell personal information)</li>
                <li>Right to non-discrimination for exercising your privacy rights</li>
              </ul>
              <p className="text-[var(--color-text)] leading-relaxed mt-4">
                To exercise these rights, contact us at stecher2789@gmail.com.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Changes to This Privacy Policy</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by 
                updating the "Last Updated" date at the top of this policy. Your continued use of the service after 
                such changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Contact Us</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="bg-gray-50 rounded-lg p-6 mt-4">
                <p className="text-[var(--color-text)] font-semibold">SNPS Squares</p>
                <p className="text-[var(--color-text)]">Email: <a href="mailto:stecher2789@gmail.com" className="text-[var(--color-primary)] hover:underline">stecher2789@gmail.com</a></p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 px-4 mt-12">
        <div className="container mx-auto max-w-7xl flex flex-wrap justify-center gap-4 sm:gap-8 text-sm font-medium text-[var(--color-text-muted)]">
          <Link to="/privacy" className="hover:text-[var(--color-primary)] transition-colors hover:underline">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-[var(--color-primary)] transition-colors hover:underline">
            Terms of Service
          </Link>
        </div>
        <div className="container mx-auto max-w-7xl text-center mt-3">
          <p className="text-xs text-[var(--color-text-muted)]">
            © {new Date().getFullYear()} SNPS Squares. Not affiliated with the NFL.
          </p>
        </div>
      </footer>
    </div>
  )
}
