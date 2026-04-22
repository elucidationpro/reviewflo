'use client';

import Head from 'next/head'
import Link from 'next/link'
import { SiteNav, SITE_NAV_SPACER_CLASS } from '@/components/SiteNav'
import SiteFooter from '@/components/SiteFooter'

function SectionBadge({ n }: { n: string }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-full bg-[#E8DCC8] text-[#4A3428] text-xs font-bold flex-shrink-0 mt-0.5">
      {n}
    </span>
  );
}

const TOC_TERMS = [
  { id: 'intro', label: 'Introduction & Beta Notice' },
  { id: 'acceptance', label: 'Acceptance of Terms' },
  { id: 'service', label: 'Service Description' },
  { id: 'review-practices', label: 'Review Collection Practices' },
  { id: 'responsibilities', label: 'User Responsibilities' },
  { id: 'compliance', label: 'Review Platform Compliance' },
  { id: 'pricing', label: 'Pricing & Beta Terms' },
  { id: 'liability', label: 'Limitation of Liability' },
  { id: 'termination', label: 'Service Termination' },
  { id: 'ip', label: 'Intellectual Property' },
  { id: 'data', label: 'Data Ownership & Retention' },
  { id: 'indemnification', label: 'Indemnification' },
  { id: 'changes', label: 'Changes to Terms' },
  { id: 'law', label: 'Governing Law' },
  { id: 'contact-terms', label: 'Contact Information' },
];

const TOC_PRIVACY = [
  { id: 'collect', label: 'Information We Collect' },
  { id: 'use', label: 'How We Use Information' },
  { id: 'sharing', label: 'Information Sharing' },
  { id: 'security', label: 'Data Security' },
  { id: 'customer-data', label: 'Customer-Provided Information' },
  { id: 'retention', label: 'Data Retention' },
  { id: 'rights', label: 'Your Rights' },
  { id: 'cookies', label: 'Cookies & Tracking' },
  { id: 'children', label: "Children's Privacy" },
  { id: 'policy-changes', label: 'Changes to Privacy Policy' },
  { id: 'contact-privacy', label: 'Contact Us' },
];

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>Terms of Service & Privacy Policy - ReviewFlo</title>
        <meta name="description" content="ReviewFlo Terms of Service and Privacy Policy. Beta service terms and conditions." />
        <meta name="robots" content="index, follow" />
      </Head>
      <div className="min-h-screen bg-white">
        <SiteNav variant="marketing" />
        <div className={SITE_NAV_SPACER_CLASS} />

        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#E8DCC8]/30 via-white to-[#E8DCC8]/30 py-12 sm:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
              Terms of Service
            </h1>
            <p className="text-gray-600 text-base mb-1">Last Updated: November 11, 2025</p>
            <p className="text-gray-500 text-sm">
              Questions?{' '}
              <a href="mailto:support@usereviewflo.com" className="text-[#4A3428] hover:underline font-medium">
                support@usereviewflo.com
              </a>
            </p>
          </div>
        </section>

        {/* Layout: TOC sidebar + content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="lg:flex lg:gap-12">

            {/* Sticky TOC sidebar (desktop only) */}
            <aside className="hidden lg:block w-60 flex-shrink-0">
              <div className="sticky top-24 space-y-6">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Terms of Service</p>
                  <nav className="space-y-1">
                    {TOC_TERMS.map(({ id, label }) => (
                      <a
                        key={id}
                        href={`#${id}`}
                        className="block text-xs text-gray-500 hover:text-[#4A3428] hover:pl-1 transition-all duration-150 py-0.5 leading-snug"
                      >
                        {label}
                      </a>
                    ))}
                  </nav>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Privacy Policy</p>
                  <nav className="space-y-1">
                    {TOC_PRIVACY.map(({ id, label }) => (
                      <a
                        key={id}
                        href={`#${id}`}
                        className="block text-xs text-gray-500 hover:text-[#4A3428] hover:pl-1 transition-all duration-150 py-0.5 leading-snug"
                      >
                        {label}
                      </a>
                    ))}
                  </nav>
                </div>
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0">

              {/* ─── TERMS OF SERVICE ─── */}
              <div className="space-y-10 mb-16">

                <div id="intro" className="scroll-mt-24 p-5 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex gap-4">
                    <SectionBadge n="1" />
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 mb-3">Introduction &amp; Beta Service Notice</h2>
                      <p className="text-gray-700 text-sm mb-3">
                        Welcome to ReviewFlo (&quot;Service&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). By accessing or using ReviewFlo, you agree to be bound by these Terms of Service.
                      </p>
                      <div className="flex items-start gap-2 mb-3">
                        <span className="inline-block px-2 py-0.5 bg-amber-200 text-amber-800 text-xs font-bold rounded uppercase tracking-wide flex-shrink-0 mt-0.5">Beta</span>
                        <p className="text-amber-800 text-sm font-medium">ReviewFlo is currently in BETA. The service is under active development and testing.</p>
                      </div>
                      <ul className="space-y-1.5 text-sm text-gray-700">
                        {[
                          'The service may contain bugs, errors, or limitations',
                          'Features may change or be removed without notice',
                          'Service availability and uptime are not guaranteed',
                          'Data retention is not guaranteed — you should maintain your own records',
                          'Pricing and subscription plans may change after the beta period ends',
                          'We reserve the right to terminate the service at any time',
                        ].map((item) => (
                          <li key={item} className="flex gap-2"><span className="text-amber-500 font-bold mt-0.5">·</span><span>{item}</span></li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {[
                  {
                    id: 'acceptance', n: '2', title: 'Acceptance of Terms',
                    intro: 'By creating an account, accessing, or using ReviewFlo, you confirm that:',
                    items: [
                      'You have read and understood these Terms',
                      'You agree to be bound by these Terms',
                      'You are at least 18 years old or have parental/guardian consent',
                      'You have the authority to bind your business to these Terms',
                      'You understand this is a beta service with inherent limitations',
                    ],
                  },
                  {
                    id: 'service', n: '3', title: 'Service Description',
                    intro: 'ReviewFlo provides a platform for service businesses to:',
                    items: [
                      'Collect customer feedback and ratings',
                      'Direct customers to public review platforms (Google, Yelp, Facebook, Nextdoor)',
                      'Offer customers a private feedback option alongside public review links',
                      'Manage and respond to customer feedback',
                    ],
                    note: 'ReviewFlo is a tool to facilitate review collection. We do not and cannot guarantee that customers will leave reviews, the content or rating of any reviews, that reviews will remain published, or compliance with all review platform policies.',
                  },
                  {
                    id: 'review-practices', n: '4', title: 'Review Collection Practices',
                    intro: 'To comply with the FTC Consumer Review Rule and the policies of Google, Yelp, Facebook, and other review platforms, ReviewFlo follows these practices:',
                    items: [
                      'ReviewFlo sends review request messages to customers on behalf of Businesses.',
                      'Every customer sees the public review link (e.g. Google) regardless of the rating they submit. ReviewFlo does not suppress, hide, or filter reviews based on sentiment.',
                      'Businesses may not use ReviewFlo to gate, suppress, or incentivize reviews based on sentiment.',
                      "ReviewFlo's private-feedback feature exists to help Businesses improve service. It does not prevent negative reviews from being posted: customers who submit a low rating still see the public review link and can post a public review at any time.",
                      'Attempting to use ReviewFlo for review gating, review suppression, or sentiment-based filtering violates these Terms and may result in account termination.',
                    ],
                  },
                  {
                    id: 'responsibilities', n: '5', title: 'User Responsibilities',
                    intro: 'You agree to:',
                    items: [
                      'Provide accurate and complete information about your business',
                      'Maintain the security of your account credentials',
                      'Comply with all applicable laws and regulations',
                      'Comply with the terms of service of all third-party review platforms',
                      'Not incentivize, coerce, or manipulate customers into leaving positive reviews',
                      'Not use the service for fraudulent or deceptive purposes',
                      'Not attempt to circumvent or manipulate review platform algorithms or policies',
                      'Respond professionally to customer feedback',
                      'Back up any important data as we do not guarantee data retention during beta',
                    ],
                  },
                ].map(({ id, n, title, intro, items, note }) => (
                  <div key={id} id={id} className="scroll-mt-24 flex gap-4">
                    <SectionBadge n={n} />
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-gray-900 mb-3">{title}</h2>
                      {intro && <p className="text-gray-600 text-sm mb-3">{intro}</p>}
                      <ul className="space-y-1.5 text-sm text-gray-600">
                        {items.map((item) => (
                          <li key={item} className="flex gap-2"><span className="text-[#C9A961] font-bold mt-0.5">·</span><span>{item}</span></li>
                        ))}
                      </ul>
                      {note && <p className="mt-3 text-sm text-gray-500 italic">{note}</p>}
                    </div>
                  </div>
                ))}

                <div id="compliance" className="scroll-mt-24 flex gap-4">
                  <SectionBadge n="6" />
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-900 mb-3">Review Platform Compliance</h2>
                    <p className="text-sm font-semibold text-gray-800 mb-3">
                      You are solely responsible for ensuring your use of ReviewFlo complies with the terms of service and policies of Google, Yelp, Facebook, Nextdoor, and any other review platforms you use.
                    </p>
                    <p className="text-gray-600 text-sm mb-2">We are not responsible if:</p>
                    <ul className="space-y-1.5 text-sm text-gray-600">
                      {[
                        'Your reviews are removed or flagged by review platforms',
                        'Your business profile is suspended or banned from review platforms',
                        'Review platforms change their policies regarding review solicitation',
                        "Your use of ReviewFlo violates any review platform's terms of service",
                      ].map((item) => (
                        <li key={item} className="flex gap-2"><span className="text-[#C9A961] font-bold mt-0.5">·</span><span>{item}</span></li>
                      ))}
                    </ul>
                  </div>
                </div>

                {[
                  {
                    id: 'pricing', n: '7', title: 'Pricing & Beta Terms',
                    intro: 'During the beta period:',
                    items: [
                      'Current pricing may be discounted or promotional',
                      'Pricing is subject to change when beta ends or at any time with notice',
                      'Beta users may receive special pricing or grandfathered rates (at our sole discretion)',
                      'We reserve the right to modify, suspend, or discontinue any pricing plans',
                      'Refunds may be provided at our sole discretion',
                    ],
                  },
                  {
                    id: 'liability', n: '8', title: 'Limitation of Liability',
                    intro: 'To the maximum extent permitted by law:',
                    items: [
                      'ReviewFlo is provided "AS IS" and "AS AVAILABLE" during beta',
                      'We make no warranties, express or implied, regarding the service',
                      'We are not liable for any damages arising from your use of the service',
                      'We are not liable for negative reviews, lost reviews, or review platform actions',
                      'We are not liable for data loss, service interruptions, or bugs during beta',
                      'We are not liable for any business losses, lost profits, or indirect damages',
                      'Our total liability shall not exceed the amount you paid us in the past 12 months',
                    ],
                  },
                  {
                    id: 'termination', n: '9', title: 'Service Termination',
                    intro: 'We reserve the right to:',
                    items: [
                      'Suspend or terminate your account at any time for any reason',
                      'Terminate the entire ReviewFlo service at any time (with reasonable notice)',
                      'Modify or remove features without notice during beta',
                      'Refuse service to anyone for any reason',
                    ],
                    note: 'You may terminate your account at any time by contacting support@usereviewflo.com',
                  },
                  {
                    id: 'ip', n: '10', title: 'Intellectual Property',
                    intro: null,
                    items: [],
                    body: 'All intellectual property rights in ReviewFlo, including but not limited to software, design, content, and trademarks, are owned by us or our licensors. You may not copy, modify, distribute, or reverse engineer any part of the service.',
                  },
                  {
                    id: 'data', n: '11', title: 'Data Ownership & Retention',
                    intro: 'You retain ownership of your business data and customer feedback. However:',
                    items: [
                      'You grant us a license to use your data to provide the service',
                      'We may use aggregated, anonymized data for analytics and improvements',
                      'During beta, we do not guarantee data retention or backups',
                      'You are responsible for maintaining your own backup of important data',
                      'Upon account termination, your data may be deleted immediately or after a retention period',
                    ],
                  },
                  {
                    id: 'indemnification', n: '12', title: 'Indemnification',
                    intro: 'You agree to indemnify and hold harmless ReviewFlo, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:',
                    items: [
                      'Your use of the service',
                      'Your violation of these Terms',
                      "Your violation of any review platform's terms of service",
                      'Any customer complaints or disputes',
                      'Your business operations or customer interactions',
                    ],
                  },
                ].map(({ id, n, title, intro, items, note, body }: any) => (
                  <div key={id} id={id} className="scroll-mt-24 flex gap-4">
                    <SectionBadge n={n} />
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-gray-900 mb-3">{title}</h2>
                      {body && <p className="text-gray-600 text-sm leading-relaxed">{body}</p>}
                      {intro && <p className="text-gray-600 text-sm mb-3">{intro}</p>}
                      {items?.length > 0 && (
                        <ul className="space-y-1.5 text-sm text-gray-600">
                          {items.map((item: string) => (
                            <li key={item} className="flex gap-2"><span className="text-[#C9A961] font-bold mt-0.5">·</span><span>{item}</span></li>
                          ))}
                        </ul>
                      )}
                      {note && <p className="mt-3 text-sm text-gray-500 italic">{note}</p>}
                    </div>
                  </div>
                ))}

                <div id="changes" className="scroll-mt-24 flex gap-4">
                  <SectionBadge n="13" />
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-900 mb-3">Changes to Terms</h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      We reserve the right to modify these Terms at any time. We will notify you of material changes via email or through the service. Your continued use of ReviewFlo after changes constitutes acceptance of the updated Terms.
                    </p>
                  </div>
                </div>

                <div id="law" className="scroll-mt-24 flex gap-4">
                  <SectionBadge n="14" />
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-900 mb-3">Governing Law</h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
                    </p>
                  </div>
                </div>

                <div id="contact-terms" className="scroll-mt-24 flex gap-4">
                  <SectionBadge n="15" />
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-900 mb-3">Contact Information</h2>
                    <p className="text-gray-600 text-sm mb-2">For questions, concerns, or support regarding these Terms or the ReviewFlo service:</p>
                    <a href="mailto:support@usereviewflo.com" className="text-[#4A3428] font-semibold hover:underline text-sm">
                      support@usereviewflo.com
                    </a>
                  </div>
                </div>

              </div>

              {/* ─── PRIVACY POLICY ─── */}
              <div id="privacy" className="pt-12 border-t-2 border-gray-200">
                <div className="mb-10">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Privacy Policy</h1>
                  <p className="text-gray-500 text-sm">Last updated: February 19, 2026</p>
                </div>

                <div className="space-y-10">
                  {[
                    {
                      id: 'collect', n: '1', title: 'Information We Collect',
                      intro: 'We collect information you provide directly and data generated through use of our service:',
                      items: [
                        { label: 'Account Information', body: 'Business name, owner email, business slug, branding preferences' },
                        { label: 'Customer Feedback', body: 'Star ratings, feedback text, contact information (if provided by customers)' },
                        { label: 'Review Platform URLs', body: 'Links to your Google, Yelp, Facebook, and Nextdoor review pages' },
                        { label: 'Usage Data', body: 'How you use ReviewFlo, pages visited, features used' },
                      ],
                      rich: true,
                    },
                    {
                      id: 'use', n: '2', title: 'How We Use Your Information',
                      intro: 'We use the information we collect to:',
                      items: [
                        'Provide, maintain, and improve the ReviewFlo service',
                        'Send you email notifications about feedback and reviews',
                        'Respond to your support requests and communications',
                        'Monitor and analyze usage patterns and trends',
                        'Detect and prevent fraud, abuse, and security issues',
                        'Comply with legal obligations',
                      ],
                    },
                    {
                      id: 'sharing', n: '3', title: 'Information Sharing',
                      intro: 'We do not sell your personal information. We may share information in the following circumstances:',
                      items: [
                        { label: 'Service Providers', body: 'We use Supabase for database hosting and Resend for email delivery' },
                        { label: 'Legal Requirements', body: 'If required by law or in response to legal processes' },
                        { label: 'Business Transfers', body: 'In connection with a merger, acquisition, or sale of assets' },
                        { label: 'With Your Consent', body: 'When you explicitly authorize us to share information' },
                      ],
                      rich: true,
                    },
                  ].map(({ id, n, title, intro, items, rich }: any) => (
                    <div key={id} id={id} className="scroll-mt-24 flex gap-4">
                      <SectionBadge n={n} />
                      <div className="flex-1">
                        <h2 className="text-lg font-bold text-gray-900 mb-3">{title}</h2>
                        {intro && <p className="text-gray-600 text-sm mb-3">{intro}</p>}
                        <ul className="space-y-1.5 text-sm text-gray-600">
                          {items.map((item: any) => (
                            <li key={typeof item === 'string' ? item : item.label} className="flex gap-2">
                              <span className="text-[#C9A961] font-bold mt-0.5">·</span>
                              <span>{rich ? <><strong className="text-gray-800">{item.label}:</strong> {item.body}</> : item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}

                  <div id="security" className="scroll-mt-24 flex gap-4">
                    <SectionBadge n="4" />
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-gray-900 mb-3">Data Security</h2>
                      <p className="text-gray-600 text-sm mb-3">We take reasonable measures to protect your information from unauthorized access, alteration, disclosure, or destruction. However:</p>
                      <ul className="space-y-1.5 text-sm text-gray-600">
                        {['No internet transmission or electronic storage is 100% secure', 'During beta, security measures are still being refined', 'You are responsible for maintaining the security of your account credentials'].map((item) => (
                          <li key={item} className="flex gap-2"><span className="text-[#C9A961] font-bold mt-0.5">·</span><span>{item}</span></li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div id="customer-data" className="scroll-mt-24 flex gap-4">
                    <SectionBadge n="5" />
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-gray-900 mb-3">Customer-Provided Information</h2>
                      <p className="text-gray-600 text-sm mb-3">When your customers provide feedback through ReviewFlo:</p>
                      <ul className="space-y-1.5 text-sm text-gray-600">
                        {['They provide information directly to you (the business owner)', 'We store this information on your behalf', 'You are responsible for complying with privacy laws regarding customer data', 'Customers can request deletion of their information by contacting you or us'].map((item) => (
                          <li key={item} className="flex gap-2"><span className="text-[#C9A961] font-bold mt-0.5">·</span><span>{item}</span></li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div id="retention" className="scroll-mt-24 flex gap-4">
                    <SectionBadge n="6" />
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-gray-900 mb-3">Data Retention</h2>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        We retain your information for as long as your account is active or as needed to provide services. During the beta period, data retention policies are subject to change. You should maintain your own backups of important data.
                      </p>
                    </div>
                  </div>

                  <div id="rights" className="scroll-mt-24 flex gap-4">
                    <SectionBadge n="7" />
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-gray-900 mb-3">Your Rights</h2>
                      <p className="text-gray-600 text-sm mb-3">Depending on your location, you may have the right to:</p>
                      <ul className="space-y-1.5 text-sm text-gray-600 mb-3">
                        {['Access the personal information we hold about you', 'Request correction of inaccurate information', 'Request deletion of your information', 'Object to or restrict certain processing of your information', 'Export your data in a portable format'].map((item) => (
                          <li key={item} className="flex gap-2"><span className="text-[#C9A961] font-bold mt-0.5">·</span><span>{item}</span></li>
                        ))}
                      </ul>
                      <p className="text-sm text-gray-500">To exercise these rights, contact us at <a href="mailto:support@usereviewflo.com" className="text-[#4A3428] font-medium hover:underline">support@usereviewflo.com</a></p>
                    </div>
                  </div>

                  <div id="cookies" className="scroll-mt-24 flex gap-4">
                    <SectionBadge n="8" />
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-gray-900 mb-3">Cookies &amp; Tracking</h2>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        We use essential cookies for authentication and session management. We do not currently use tracking or advertising cookies, but this may change as we develop the service.
                      </p>
                    </div>
                  </div>

                  <div id="children" className="scroll-mt-24 flex gap-4">
                    <SectionBadge n="9" />
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-gray-900 mb-3">Children&apos;s Privacy</h2>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        ReviewFlo is not intended for use by individuals under 18 years of age. We do not knowingly collect information from children under 18. If you believe we have collected information from a child under 18, please contact us immediately.
                      </p>
                    </div>
                  </div>

                  <div id="policy-changes" className="scroll-mt-24 flex gap-4">
                    <SectionBadge n="10" />
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-gray-900 mb-3">Changes to Privacy Policy</h2>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        We may update this Privacy Policy from time to time. We will notify you of material changes via email or through the service. Your continued use of ReviewFlo after changes constitutes acceptance of the updated Privacy Policy.
                      </p>
                    </div>
                  </div>

                  <div id="contact-privacy" className="scroll-mt-24 flex gap-4">
                    <SectionBadge n="11" />
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-gray-900 mb-3">Contact Us</h2>
                      <p className="text-gray-600 text-sm mb-2">For privacy-related questions or concerns:</p>
                      <a href="mailto:support@usereviewflo.com" className="text-[#4A3428] font-semibold hover:underline text-sm">
                        support@usereviewflo.com
                      </a>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>

        <SiteFooter />
      </div>
    </>
  )
}
