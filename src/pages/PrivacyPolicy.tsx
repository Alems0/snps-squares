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
          <p className="text-sm text-[var(--color-text-muted)] mb-8">Last updated: November 19, 2026</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Who we are</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                SNPS Squares is a charitable fundraiser run by the Saint Nicholas Patriotic Society (SNPS).
                It is not a gambling site. When you claim a square, you are making a donation that helps
                support veterans, families in distress, and student scholarships. This policy explains what
                information we collect and how we use it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Information we collect</h2>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">
                When you claim a square, we may collect:
              </p>
              <ul className="list-disc list-inside space-y-2 text-[var(--color-text)] ml-4">
                <li>Your name</li>
                <li>Your email address</li>
                <li>Your phone number (if you provide one)</li>
                <li>Which squares you claimed and when</li>
                <li>Whether your donation/payment has been marked as paid</li>
              </ul>
              <p className="text-[var(--color-text)] leading-relaxed mt-4 mb-4">
                For administrators, we also collect the Google account email used to sign in, plus session
                information needed to keep them logged in.
              </p>
              <p className="text-[var(--color-text)] leading-relaxed">
                Our hosting provider may collect basic technical data (such as IP address or browser type)
                as part of running the site. We do not use that data to track you for advertising.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">How we use your information</h2>
              <ul className="list-disc list-inside space-y-2 text-[var(--color-text)] ml-4">
                <li>
                  <strong>Names</strong> are shown on the public board so everyone can see who claimed each square.
                </li>
                <li>
                  <strong>Email and phone</strong> are used only for payment confirmation and so an administrator
                  can contact you about your claim or donation. They are not shown publicly on the board.
                </li>
                <li>
                  <strong>Join passwords</strong> (if used for a game) are never made public. They are for
                  authorized access only and are not displayed to other participants.
                </li>
                <li>
                  Board and claim data are used to run the fundraiser, track donations, calculate charity totals
                  and payouts, and manage the game.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">What we share</h2>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">
                We do not sell or rent your personal information. We share it only as needed to run this fundraiser:
              </p>
              <ul className="list-disc list-inside space-y-2 text-[var(--color-text)] ml-4">
                <li>Your name appears on the public board (and related public lists, such as top buyers).</li>
                <li>Administrators can see claim details, including email and phone when provided, to confirm payments and contact participants.</li>
                <li>Our database and hosting provider stores the data needed to operate the app.</li>
                <li>We may disclose information if the law requires it.</li>
              </ul>
              <p className="text-[var(--color-text)] leading-relaxed mt-4">
                We do not process credit cards or store bank login details on this site. Donation payments
                (for example Venmo or cash) are handled off-platform between you and the organizer.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Cookies</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                We use session cookies mainly so administrators can stay signed in. People who only claim
                squares are not required to create an account, and we do not place advertising or tracking
                cookies for that purpose.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">How long we keep data</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                We keep board and claim records for the season and may keep historical records for charity
                reporting and future fundraiser planning. If you want your personal information removed,
                contact us at the email below and we will do our best to help.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Security</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                We take reasonable steps to protect your information. No online service is completely secure,
                so we cannot promise absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Children</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                This fundraiser is intended for adults (18 and older). We do not knowingly collect information
                from children. If you believe a child has submitted information, please contact us so we can
                remove it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Your choices</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                You can ask what personal information we have about you, or ask us to delete it, by emailing
                us. If you are a California resident, you also have rights under state privacy law, including
                the right to know, delete, and not be discriminated against for exercising those rights. We
                do not sell personal information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Changes</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                We may update this policy from time to time. When we do, we will change the “Last updated”
                date at the top. Continued use of the site after an update means you accept the revised policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Contact</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                Questions about this Privacy Policy? Contact us:
              </p>
              <div className="bg-gray-50 rounded-lg p-6 mt-4">
                <p className="text-[var(--color-text)] font-semibold">Saint Nicholas Patriotic Society — SNPS Squares</p>
                <p className="text-[var(--color-text)]">
                  Email:{' '}
                  <a href="mailto:stecher2789@gmail.com" className="text-[var(--color-primary)] hover:underline">
                    stecher2789@gmail.com
                  </a>
                </p>
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
