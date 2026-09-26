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
          <p className="text-sm text-[var(--color-text-muted)] mb-8">Last Updated: September 2026</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Acceptance of Terms</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                By accessing and using SNPS Squares (the "Service"), you accept and agree to be bound by these 
                Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service. 
                These Terms apply to all users of the Service, including administrators and participants.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Description of Service</h2>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">
                SNPS Squares is a charitable fundraising platform operated by SNPS (Sunday Night Pong Series) that 
                provides a Super Bowl squares board for entertainment purposes. The Service allows participants to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-[var(--color-text)] ml-4">
                <li>Claim squares on a 10x10 Super Bowl squares board</li>
                <li>View the board state and track game progress</li>
                <li>Participate in a community fundraising activity</li>
                <li>See leaderboards and top buyers</li>
              </ul>
              <p className="text-[var(--color-text)] leading-relaxed mt-4">
                A portion of all proceeds is donated to charitable causes as determined by SNPS organizers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Eligibility and User Conduct</h2>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">
                You must be at least 18 years of age to participate in SNPS Squares. By using the Service, you represent 
                that you meet this age requirement and have the legal capacity to enter into these Terms.
              </p>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">
                You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-[var(--color-text)] ml-4">
                <li>Claim squares using false or misleading information</li>
                <li>Attempt to manipulate, exploit, or abuse the Service</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Use automated tools to claim squares or scrape data</li>
                <li>Violate any applicable laws or regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Not Affiliated with the NFL</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                SNPS Squares is an independent charitable fundraiser and is <strong>not affiliated with, endorsed by, 
                or sponsored by the National Football League (NFL)</strong>, any NFL team, or the Super Bowl. All team 
                names, logos, and references are used for identification and entertainment purposes only. NFL-related 
                trademarks and copyrights are property of their respective owners.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Payments and Financial Transactions</h2>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">
                <strong>Important:</strong> SNPS Squares does NOT process payments directly. All payments are handled 
                off-platform through peer-to-peer payment services (such as Venmo) or cash transactions between 
                participants and the administrator.
              </p>
              <ul className="list-disc list-inside space-y-2 text-[var(--color-text)] ml-4">
                <li>The cost per square is clearly displayed on the board page</li>
                <li>Payment instructions and the administrator's payment handle are provided separately</li>
                <li>Participants are responsible for sending payment to the designated administrator</li>
                <li>The administrator is responsible for tracking payments within the Service</li>
                <li>We do not store credit card information or payment credentials</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Charitable Fundraising and Legal Compliance</h2>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">
                SNPS Squares is operated as a charitable fundraiser. A percentage of all proceeds is donated to 
                charitable causes as determined by SNPS organizers. However:
              </p>
              <ul className="list-disc list-inside space-y-2 text-[var(--color-text)] ml-4">
                <li>Participants should be aware of and comply with local laws regarding gaming, gambling, and fundraising activities</li>
                <li>The organizer is responsible for ensuring compliance with applicable charitable gaming regulations</li>
                <li>This Service is intended for entertainment and community fundraising purposes only</li>
                <li>Participants are responsible for understanding and complying with their local jurisdictional requirements</li>
              </ul>
              <p className="text-[var(--color-text)] leading-relaxed mt-4">
                By participating, you acknowledge that you are familiar with and will comply with all applicable laws in your jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Prize Distribution and Winnings</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                Winners are determined by the last digit of each team's score at the end of each quarter of the 
                Super Bowl game. Prize amounts and distribution are at the discretion of the SNPS administrator and 
                are clearly communicated to participants. We do not guarantee specific prize amounts or distributions. 
                Prize payments are handled directly by the administrator through the same off-platform payment methods 
                used for square purchases.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Intellectual Property</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                The Service and its original content, features, and functionality are owned by SNPS and are protected 
                by international copyright, trademark, patent, trade secret, and other intellectual property laws. 
                You may not copy, modify, distribute, sell, or lease any part of the Service without prior written 
                consent from SNPS.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Disclaimers and Limitation of Liability</h2>
              
              <h3 className="text-xl font-semibold text-[var(--color-text)] mt-6 mb-3">No Warranties</h3>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">
                THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, 
                EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, 
                FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
              </p>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">
                We do not warrant that:
              </p>
              <ul className="list-disc list-inside space-y-2 text-[var(--color-text)] ml-4">
                <li>The Service will be uninterrupted, secure, or error-free</li>
                <li>The results obtained from using the Service will be accurate or reliable</li>
                <li>The quality of the Service will meet your expectations</li>
                <li>Any errors in the Service will be corrected</li>
              </ul>

              <h3 className="text-xl font-semibold text-[var(--color-text)] mt-6 mb-3">Limitation of Liability</h3>
              <p className="text-[var(--color-text)] leading-relaxed mb-4">
                TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL SNPS, ITS OFFICERS, DIRECTORS, 
                EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE 
                DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE 
                LOSSES, RESULTING FROM:
              </p>
              <ul className="list-disc list-inside space-y-2 text-[var(--color-text)] ml-4">
                <li>Your access to or use of or inability to access or use the Service</li>
                <li>Any conduct or content of any third party on the Service</li>
                <li>Any content obtained from the Service</li>
                <li>Unauthorized access, use, or alteration of your transmissions or content</li>
                <li>Payment disputes between participants and administrators</li>
              </ul>
              <p className="text-[var(--color-text)] leading-relaxed mt-4">
                YOUR SOLE REMEDY FOR DISSATISFACTION WITH THE SERVICE IS TO STOP USING THE SERVICE.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Indemnification</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                You agree to defend, indemnify, and hold harmless SNPS and its officers, directors, employees, and 
                agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable 
                attorney's fees, arising out of or in any way connected with your access to or use of the Service, 
                your violation of these Terms, or your violation of any rights of another person or entity.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Termination</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                We reserve the right to suspend or terminate your access to the Service at any time, without notice, 
                for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, 
                or for any other reason in our sole discretion. Upon termination, your right to use the Service will 
                immediately cease.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Changes to Terms</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                We reserve the right to modify or replace these Terms at any time at our sole discretion. If a 
                revision is material, we will provide notice by updating the "Last Updated" date at the top of 
                these Terms. Your continued use of the Service after any such changes constitutes your acceptance 
                of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Governing Law</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in 
                which SNPS operates, without regard to its conflict of law provisions. Any disputes arising from 
                these Terms or your use of the Service shall be resolved in the courts of that jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Severability</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                If any provision of these Terms is found to be unenforceable or invalid, that provision shall be 
                limited or eliminated to the minimum extent necessary so that these Terms shall otherwise remain 
                in full force and effect and enforceable.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Entire Agreement</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                These Terms, together with our Privacy Policy, constitute the entire agreement between you and SNPS 
                regarding the use of the Service and supersede any prior agreements between you and SNPS relating 
                to your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">Contact Us</h2>
              <p className="text-[var(--color-text)] leading-relaxed">
                If you have any questions about these Terms, please contact us at:
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
