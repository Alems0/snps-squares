import { Link } from 'react-router-dom'

export default function TermsOfService() {
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
          <h1 className="text-4xl font-bold text-[var(--color-primary)] mb-2">Terms of Service</h1>
          <p className="text-sm text-[var(--color-text-muted)] mb-8">Last updated: November 19, 2026</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Agreement</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                By using SNPS Squares (the “Service”), you agree to these Terms of Service. If you do not
                agree, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">What this is</h2>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">
                SNPS Squares is a charitable fundraiser for the Saint Nicholas Patriotic Society (SNPS).
                It is <strong>not a gambling site</strong>. The board is a community fundraising activity
                tied to a football game for fun and fundraising.
              </p>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">
                When you claim a square, you are making a donation that supports the charity. Proceeds and
                payouts from this fundraiser help support veterans, families in distress, and student scholarships.
              </p>
              <p className="text-[var(--color-text)] leading-relaxed">
                The Service lets you view the board, claim squares, see game progress, and participate in
                the fundraiser. Prize amounts and charity percentages are set by the organizers and shown
                on the board where applicable.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Your responsibility</h2>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">
                You accept responsibility for your own actions and for following the laws where you live.
                You must be at least 18 years old to participate. By using the Service, you confirm that
                you meet that age requirement and that joining this fundraiser is allowed under your local laws.
              </p>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 text-[var(--color-text)] ml-4">
                <li>Claim squares with false or misleading information</li>
                <li>Try to break, abuse, or unfairly manipulate the Service</li>
                <li>Use bots or automated tools to claim squares or scrape the site</li>
                <li>Interfere with other participants or the organizers</li>
                <li>Violate any applicable law</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Admin rights</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                SNPS administrators may remove claims, free up squares, mark payments, adjust board settings,
                or refuse participation at any time if they believe it is needed for fairness, accuracy,
                safety, or to protect the fundraiser. They may also suspend or end access to the Service
                for conduct that violates these Terms or harms the community.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Not affiliated with the NFL</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                SNPS Squares is an independent charitable fundraiser and is <strong>not affiliated with,
                endorsed by, or sponsored by the National Football League (NFL)</strong>, any NFL team, or
                the Super Bowl. Team names and related references are used only for identification and
                entertainment. NFL trademarks belong to their owners.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Donations and payments</h2>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">
                Claiming a square is a donation to support SNPS’s charitable work. This site does{' '}
                <strong>not</strong> process payments itself. Donations are typically paid off-platform
                (for example Venmo or cash) to the organizer. The cost per square and payment instructions
                are provided separately. We do not store credit card numbers or bank passwords.
              </p>
              <p className="text-[var(--color-text)] leading-relaxed">
                You are responsible for sending payment as instructed. The administrator tracks paid and
                unpaid claims in the Service. Payment disputes between participants and organizers are
                handled outside this app.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Payouts</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                Where the fundraiser includes square payouts, winners are generally based on the last digit
                of each team’s score at the end of each quarter (or as otherwise explained on the board).
                Payout amounts and timing are decided by SNPS organizers and communicated to participants.
                We do not guarantee any specific prize amount. Payouts, like donations, are handled by the
                organizer off-platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Privacy</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                How we collect and use information is described in our{' '}
                <Link to="/privacy" className="text-[var(--color-primary)] hover:underline">
                  Privacy Policy
                </Link>
                . In short: names appear on the board; email and phone (if provided) are used only for
                payment confirmation and admin contact; join passwords are never made public.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">No warranties</h2>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">
                The Service is provided <strong>“as is” and “as available.”</strong> We make no warranties
                of any kind—express or implied—including warranties of merchantability, fitness for a
                particular purpose, or non-infringement.
              </p>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">We do not promise that:</p>
              <ul className="list-disc list-inside space-y-2 text-[var(--color-text)] ml-4">
                <li>The Service will always be available, uninterrupted, or error-free</li>
                <li>Information on the board will always be complete or accurate</li>
                <li>The Service will meet your expectations</li>
                <li>Any problem will be fixed within a certain time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Limitation of liability</h2>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">
                To the fullest extent allowed by law, Saint Nicholas Patriotic Society, SNPS Squares, and
                their organizers, officers, volunteers, and agents are not liable for any indirect,
                incidental, special, consequential, or punitive damages—or for loss of profits, data, or
                goodwill—arising from:
              </p>
              <ul className="list-disc list-inside space-y-2 text-[var(--color-text)] ml-4">
                <li>Your use of, or inability to use, the Service</li>
                <li>Removed claims, refused participation, or other admin decisions</li>
                <li>Errors, downtime, or technical problems</li>
                <li>Actions of other participants or third parties</li>
                <li>Payment or payout disputes handled off-platform</li>
                <li>Your failure to follow local laws</li>
              </ul>
              <p className="text-[var(--color-text)] leading-relaxed mt-4">
                Your only remedy if you are unhappy with the Service is to stop using it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Indemnification</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                You agree to hold SNPS and its organizers harmless from claims, losses, and expenses
                (including reasonable attorney’s fees) that arise from your use of the Service, your
                violation of these Terms, or your violation of someone else’s rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Intellectual property</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                The Service’s design, content, and features belong to SNPS (except for third-party marks
                such as NFL-related names). You may not copy, sell, or reuse the Service without permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Changes to these Terms</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                We may update these Terms at any time. When we do, we will change the “Last updated” date
                at the top. Continued use after a change means you accept the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Governing law</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                These Terms are governed by the laws of the jurisdiction where SNPS operates, without regard
                to conflict-of-law rules. Disputes will be handled in the courts of that jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Other</h2>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">
                If one part of these Terms cannot be enforced, the rest still applies. These Terms and our
                Privacy Policy are the full agreement between you and SNPS about use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Contact</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                Questions about these Terms? Contact us:
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
