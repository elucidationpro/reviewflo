import Head from 'next/head'
import Link from 'next/link'

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>Terms of Service & Privacy Policy - ReviewFlo</title>
        <meta name="description" content="ReviewFlo Terms of Service and Privacy Policy. Beta service terms and conditions." />
        <meta name="robots" content="index, follow" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
            <p className="text-gray-600">Last Updated: November 11, 2025</p>
            <p className="text-gray-600 mt-2">Contact: support@usereviewflo.com</p>
          </div>

          {/* Terms Content */}
          <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 mb-8">
            <div className="prose prose-gray max-w-none">

              {/* Introduction */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction & Beta Service Notice</h2>
                <p className="text-gray-700 mb-4">
                  Welcome to ReviewFlo (&quot;Service&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). By accessing or using ReviewFlo, you agree to be bound by these Terms of Service (&quot;Terms&quot;).
                </p>
                <p className="text-gray-700 mb-4">
                  <strong className="text-red-600">IMPORTANT: ReviewFlo is currently in BETA.</strong> This means the service is under active development and testing. By using ReviewFlo during the beta period, you acknowledge and agree that:
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                  <li>The service may contain bugs, errors, or limitations</li>
                  <li>Features may change or be removed without notice</li>
                  <li>Service availability and uptime are not guaranteed</li>
                  <li>Data retention is not guaranteed - you should maintain your own records</li>
                  <li>Pricing and subscription plans may change after the beta period ends</li>
                  <li>We reserve the right to terminate the service at any time</li>
                </ul>
              </section>

              {/* Acceptance of Terms */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Acceptance of Terms</h2>
                <p className="text-gray-700 mb-4">
                  By creating an account, accessing, or using ReviewFlo, you confirm that:
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                  <li>You have read and understood these Terms</li>
                  <li>You agree to be bound by these Terms</li>
                  <li>You are at least 18 years old or have parental/guardian consent</li>
                  <li>You have the authority to bind your business to these Terms</li>
                  <li>You understand this is a beta service with inherent limitations</li>
                </ul>
              </section>

              {/* Service Description */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Service Description</h2>
                <p className="text-gray-700 mb-4">
                  ReviewFlo provides a platform for service businesses to:
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                  <li>Collect customer feedback and ratings</li>
                  <li>Direct satisfied customers to public review platforms (Google, Yelp, Facebook, Nextdoor)</li>
                  <li>Capture private feedback from dissatisfied customers</li>
                  <li>Manage and respond to customer feedback</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  <strong>IMPORTANT DISCLAIMER:</strong> ReviewFlo is a tool to facilitate review collection. We do not and cannot guarantee:
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                  <li>That customers will leave reviews on any platform</li>
                  <li>The content or rating of any reviews left by customers</li>
                  <li>That reviews will remain published on third-party platforms</li>
                  <li>Compliance with all review platform policies (this is your responsibility)</li>
                  <li>Service uptime, availability, or performance during beta testing</li>
                </ul>
              </section>

              {/* User Responsibilities */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. User Responsibilities</h2>
                <p className="text-gray-700 mb-4">You agree to:</p>
                <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                  <li>Provide accurate and complete information about your business</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Comply with all applicable laws and regulations</li>
                  <li>Comply with the terms of service of all third-party review platforms (Google, Yelp, Facebook, Nextdoor)</li>
                  <li>Not incentivize, coerce, or manipulate customers into leaving positive reviews</li>
                  <li>Not use the service for fraudulent or deceptive purposes</li>
                  <li>Not attempt to circumvent or manipulate review platform algorithms or policies</li>
                  <li>Respond professionally to customer feedback</li>
                  <li>Back up any important data as we do not guarantee data retention during beta</li>
                </ul>
              </section>

              {/* Review Platform Compliance */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Review Platform Compliance</h2>
                <p className="text-gray-700 mb-4">
                  <strong>You are solely responsible for ensuring your use of ReviewFlo complies with the terms of service and policies of Google, Yelp, Facebook, Nextdoor, and any other review platforms you use.</strong>
                </p>
                <p className="text-gray-700 mb-4">
                  We are not responsible if:
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                  <li>Your reviews are removed or flagged by review platforms</li>
                  <li>Your business profile is suspended or banned from review platforms</li>
                  <li>Review platforms change their policies regarding review solicitation</li>
                  <li>Your use of ReviewFlo violates any review platform&apos;s terms of service</li>
                </ul>
              </section>

              {/* Pricing and Beta Terms */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Pricing & Beta Terms</h2>
                <p className="text-gray-700 mb-4">
                  During the beta period:
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                  <li>Current pricing may be discounted or promotional</li>
                  <li>Pricing is subject to change when beta ends or at any time with notice</li>
                  <li>Beta users may receive special pricing or grandfathered rates (at our sole discretion)</li>
                  <li>We reserve the right to modify, suspend, or discontinue any pricing plans</li>
                  <li>Refunds may be provided at our sole discretion</li>
                </ul>
              </section>

              {/* Limitation of Liability */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Limitation of Liability</h2>
                <p className="text-gray-700 mb-4">
                  <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</strong>
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                  <li>ReviewFlo is provided &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; during beta</li>
                  <li>We make no warranties, express or implied, regarding the service</li>
                  <li>We are not liable for any damages arising from your use of the service</li>
                  <li>We are not liable for negative reviews, lost reviews, or review platform actions</li>
                  <li>We are not liable for data loss, service interruptions, or bugs during beta</li>
                  <li>We are not liable for any business losses, lost profits, or indirect damages</li>
                  <li>Our total liability shall not exceed the amount you paid us in the past 12 months</li>
                </ul>
              </section>

              {/* Service Termination */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Service Termination</h2>
                <p className="text-gray-700 mb-4">
                  We reserve the right to:
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                  <li>Suspend or terminate your account at any time for any reason</li>
                  <li>Terminate the entire ReviewFlo service at any time (with reasonable notice)</li>
                  <li>Modify or remove features without notice during beta</li>
                  <li>Refuse service to anyone for any reason</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  You may terminate your account at any time by contacting support@usereviewflo.com
                </p>
              </section>

              {/* Intellectual Property */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Intellectual Property</h2>
                <p className="text-gray-700 mb-4">
                  All intellectual property rights in ReviewFlo, including but not limited to software, design, content, and trademarks, are owned by us or our licensors. You may not copy, modify, distribute, or reverse engineer any part of the service.
                </p>
              </section>

              {/* Data Ownership */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Data Ownership & Retention</h2>
                <p className="text-gray-700 mb-4">
                  You retain ownership of your business data and customer feedback. However:
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                  <li>You grant us a license to use your data to provide the service</li>
                  <li>We may use aggregated, anonymized data for analytics and improvements</li>
                  <li><strong>During beta, we do not guarantee data retention or backups</strong></li>
                  <li>You are responsible for maintaining your own backup of important data</li>
                  <li>Upon account termination, your data may be deleted immediately or after a retention period</li>
                </ul>
              </section>

              {/* Indemnification */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Indemnification</h2>
                <p className="text-gray-700 mb-4">
                  You agree to indemnify and hold harmless ReviewFlo, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                  <li>Your use of the service</li>
                  <li>Your violation of these Terms</li>
                  <li>Your violation of any review platform&apos;s terms of service</li>
                  <li>Any customer complaints or disputes</li>
                  <li>Your business operations or customer interactions</li>
                </ul>
              </section>

              {/* Changes to Terms */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Changes to Terms</h2>
                <p className="text-gray-700 mb-4">
                  We reserve the right to modify these Terms at any time. We will notify you of material changes via email or through the service. Your continued use of ReviewFlo after changes constitutes acceptance of the updated Terms.
                </p>
              </section>

              {/* Governing Law */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Governing Law</h2>
                <p className="text-gray-700 mb-4">
                  These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
                </p>
              </section>

              {/* Contact */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Contact Information</h2>
                <p className="text-gray-700 mb-4">
                  For questions, concerns, or support regarding these Terms or the ReviewFlo service, please contact us at:
                </p>
                <p className="text-gray-700 font-semibold">
                  support@usereviewflo.com
                </p>
              </section>

            </div>
          </div>

          {/* Privacy Policy */}
          <div id="privacy" className="bg-white rounded-xl shadow-lg p-8 md:p-12 mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">Privacy Policy</h1>

            <div className="prose prose-gray max-w-none">

              {/* Information We Collect */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
                <p className="text-gray-700 mb-4">
                  We collect information you provide directly to us:
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                  <li><strong>Account Information:</strong> Business name, owner email, business slug, branding preferences</li>
                  <li><strong>Customer Feedback:</strong> Star ratings, feedback text, contact information (if provided by customers)</li>
                  <li><strong>Review Platform URLs:</strong> Links to your Google, Yelp, Facebook, and Nextdoor review pages</li>
                  <li><strong>Usage Data:</strong> How you use ReviewFlo, pages visited, features used</li>
                </ul>
              </section>

              {/* How We Use Information */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
                <p className="text-gray-700 mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                  <li>Provide, maintain, and improve the ReviewFlo service</li>
                  <li>Send you email notifications about feedback and reviews</li>
                  <li>Respond to your support requests and communications</li>
                  <li>Monitor and analyze usage patterns and trends</li>
                  <li>Detect and prevent fraud, abuse, and security issues</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              {/* Information Sharing */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Information Sharing</h2>
                <p className="text-gray-700 mb-4">
                  We do not sell your personal information. We may share information in the following circumstances:
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                  <li><strong>Service Providers:</strong> We use Supabase for database hosting and Resend for email delivery</li>
                  <li><strong>Legal Requirements:</strong> If required by law or in response to legal processes</li>
                  <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                  <li><strong>With Your Consent:</strong> When you explicitly authorize us to share information</li>
                </ul>
              </section>

              {/* Data Security */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Security</h2>
                <p className="text-gray-700 mb-4">
                  We take reasonable measures to protect your information from unauthorized access, alteration, disclosure, or destruction. However:
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                  <li>No internet transmission or electronic storage is 100% secure</li>
                  <li>During beta, security measures are still being refined</li>
                  <li>You are responsible for maintaining the security of your account credentials</li>
                </ul>
              </section>

              {/* Customer Data */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Customer-Provided Information</h2>
                <p className="text-gray-700 mb-4">
                  When your customers provide feedback through ReviewFlo:
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                  <li>They provide information directly to you (the business owner)</li>
                  <li>We store this information on your behalf</li>
                  <li>You are responsible for complying with privacy laws regarding customer data</li>
                  <li>Customers can request deletion of their information by contacting you or us</li>
                </ul>
              </section>

              {/* Data Retention */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Retention</h2>
                <p className="text-gray-700 mb-4">
                  We retain your information for as long as your account is active or as needed to provide services. During the beta period, data retention policies are subject to change. You should maintain your own backups of important data.
                </p>
              </section>

              {/* Your Rights */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Rights</h2>
                <p className="text-gray-700 mb-4">
                  Depending on your location, you may have the right to:
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                  <li>Access the personal information we hold about you</li>
                  <li>Request correction of inaccurate information</li>
                  <li>Request deletion of your information</li>
                  <li>Object to or restrict certain processing of your information</li>
                  <li>Export your data in a portable format</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  To exercise these rights, contact us at support@usereviewflo.com
                </p>
              </section>

              {/* Cookies and Tracking */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Cookies & Tracking</h2>
                <p className="text-gray-700 mb-4">
                  We use essential cookies for authentication and session management. We do not currently use tracking or advertising cookies, but this may change as we develop the service.
                </p>
              </section>

              {/* Children&apos;s Privacy */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Children&apos;s Privacy</h2>
                <p className="text-gray-700 mb-4">
                  ReviewFlo is not intended for use by individuals under 18 years of age. We do not knowingly collect information from children under 18. If you believe we have collected information from a child under 18, please contact us immediately.
                </p>
              </section>

              {/* Changes to Privacy Policy */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to Privacy Policy</h2>
                <p className="text-gray-700 mb-4">
                  We may update this Privacy Policy from time to time. We will notify you of material changes via email or through the service. Your continued use of ReviewFlo after changes constitutes acceptance of the updated Privacy Policy.
                </p>
              </section>

              {/* Contact */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact Us</h2>
                <p className="text-gray-700 mb-4">
                  For privacy-related questions or concerns, please contact us at:
                </p>
                <p className="text-gray-700 font-semibold">
                  support@usereviewflo.com
                </p>
              </section>

            </div>
          </div>

          {/* Back to Home Link */}
          <div className="text-center">
            <Link
              href="/"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
