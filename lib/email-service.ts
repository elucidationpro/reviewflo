import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'
const REVIEW_REQUEST_FROM =
  process.env.REVIEW_REQUEST_FROM || 'Jeremy at ReviewFlo <jeremy@usereviewflo.com>'

type EmailShellOptions = {
  title: string
  eyebrow?: string
  bodyHtml: string
  ctaLabel?: string
  ctaUrl?: string
  footerNote?: string
  unsubscribeUrl?: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function escapeHtmlMaybe(value: unknown): string {
  if (value === null || value === undefined) return 'N/A'
  return escapeHtml(String(value))
}

function toParagraph(text: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#6b5d52;">${text}</p>`
}

function toList(items: string[]): string {
  const listItems = items
    .map(
      item =>
        `<tr><td width="24" valign="top" style="padding:0 8px 10px 0;color:#10b981;font-weight:700;">&#10003;</td><td valign="top" style="padding:0 0 10px;font-size:15px;line-height:1.6;color:#4A3428;">${item}</td></tr>`
    )
    .join('')
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:6px 0 12px;">${listItems}</table>`
}

export function renderProEmailShell({
  title,
  eyebrow,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  footerNote,
  unsubscribeUrl,
}: EmailShellOptions): string {
  const eyebrowHtml = eyebrow
    ? `<p style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#4A3428;opacity:0.72;">${eyebrow}</p>`
    : ''
  const ctaHtml =
    ctaLabel && ctaUrl
      ? `<tr><td class="ep" style="padding:8px 40px 24px;text-align:left;">
          <a href="${ctaUrl}" style="display:inline-block;background:#4A3428;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;font-size:15px;letter-spacing:-0.005em;">${ctaLabel}</a>
        </td></tr>`
      : ''
  const unsubscribeHtml = unsubscribeUrl
    ? `<p style="margin:6px 0 0;font-size:11px;line-height:1.6;color:#9b8e80;">
        <a href="${unsubscribeUrl}" style="color:#9b8e80;text-decoration:none;">Unsubscribe</a>
      </p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    @media (max-width: 520px) {
      .ep { padding-left: 24px !important; padding-right: 24px !important; }
      .eh1 { font-size: 30px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#ece4d6;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#2a1f18;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ece4d6;padding:40px 16px 64px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 20px 60px -20px rgba(74,52,40,0.18);">
        <tr><td class="ep" style="background:#f8f4ee;border-top:4px solid #4A3428;padding:24px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-size:24px;line-height:1.1;font-family:Georgia,'Times New Roman',serif;color:#4A3428;font-weight:700;">ReviewFlo</td>
              <td align="right" style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#4A3428;opacity:0.6;">Email update</td>
            </tr>
          </table>
        </td></tr>
        <tr><td class="ep" style="padding:34px 40px 18px;">
          ${eyebrowHtml}
          <h1 class="eh1" style="font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:1.08;letter-spacing:-0.02em;font-weight:700;color:#4A3428;margin:0;">${title}</h1>
        </td></tr>
        <tr><td class="ep" style="padding:8px 40px 14px;">
          ${bodyHtml}
        </td></tr>
        ${ctaHtml}
        <tr><td class="ep" style="padding:22px 40px 30px;text-align:center;border-top:1px solid #e8dfd2;">
          <p style="margin:0;font-size:11px;line-height:1.6;color:#9b8e80;">${footerNote ?? 'You are receiving this because you signed up for ReviewFlo.'}</p>
          ${unsubscribeHtml}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function getListUnsubscribeHeaders() {
  const oneClickUrl = `${BASE_URL}/api/unsubscribe`
  const mailto = 'mailto:jeremy@usereviewflo.com?subject=Unsubscribe'
  return {
    'List-Unsubscribe': `<${mailto}>, <${oneClickUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  } as const
}

interface BetaSignupData {
  name: string
  email: string
  businessName: string
}

interface WaitlistSignupData {
  email: string
}

interface QualificationData {
  email: string
  businessType: string
}

interface EarlyAccessBetaWelcomeData {
  email: string
  fullName: string
  businessType: string
}

export async function sendEarlyAccessBetaWelcomeEmail(data: EarlyAccessBetaWelcomeData) {
  try {
    const bodyHtml =
      toParagraph(`Hey ${escapeHtml(data.fullName || 'there')},`) +
      toParagraph(
        "Thanks for joining the ReviewFlo beta. You're in early, and we'll keep you posted before any pricing changes."
      ) +
      toParagraph(
        `What happens next: I'll reach out within 24 hours to get your ${escapeHtml(
          data.businessType || 'business'
        )} set up. The whole process takes about 10 minutes.`
      ) +
      toList([
        'Early beta access',
        'Launch updates and priority onboarding',
        'Direct line to me (Jeremy) for support',
        'Help shape the product',
      ]) +
      toParagraph('Questions? Just reply to this email.') +
      toParagraph('Jeremy<br>Founder, ReviewFlo<br><a href="mailto:jeremy@usereviewflo.com" style="color:#4A3428;">jeremy@usereviewflo.com</a>')

    await resend.emails.send({
      from: 'Jeremy at ReviewFlo <jeremy@usereviewflo.com>',
      to: data.email,
      subject: 'Welcome to ReviewFlo beta',
      html: renderProEmailShell({
        title: "You're in! Welcome to ReviewFlo Free Beta",
        eyebrow: 'Early access',
        bodyHtml,
        footerNote: 'ReviewFlo - Stop bad reviews before they go public.',
      }),
    })

    return { success: true }
  } catch (error) {
    console.error('Error sending early access beta welcome email:', error)
    return { success: false, error }
  }
}

export async function sendBetaConfirmationEmail(data: BetaSignupData) {
  try {
    const bodyHtml =
      toParagraph(`Hey ${escapeHtml(data.name)},`) +
      toParagraph('Thanks for joining the ReviewFlo beta program.') +
      toParagraph(
        `<strong>I'll text you within 24 hours</strong> to learn about ${escapeHtml(
          data.businessName
        )} and get your review page set up. The whole process takes about 10 minutes.`
      ) +
      toList([
        '<strong>Early beta access</strong> - You are in before public launch',
        '<strong>Direct feedback line</strong> - Text or email me anytime',
        '<strong>Shape the product</strong> - Your feedback drives development',
        '<strong>Early access</strong> - First to see new features',
      ]) +
      toParagraph(
        "In the meantime, feel free to reply to this email with any questions or thoughts about what you'd like to see in ReviewFlo."
      ) +
      toParagraph(
        'Talk soon!<br><br>Jeremy<br>Founder, ReviewFlo<br><a href="mailto:jeremy@usereviewflo.com" style="color:#4A3428;">jeremy@usereviewflo.com</a>'
      )

    await resend.emails.send({
      from: 'Jeremy at ReviewFlo <jeremy@usereviewflo.com>',
      to: data.email,
      subject: 'Welcome to ReviewFlo beta',
      html: renderProEmailShell({
        title: 'Welcome to ReviewFlo Beta',
        eyebrow: 'Beta program',
        bodyHtml,
        footerNote: 'ReviewFlo - Stop bad reviews before they go public.',
      }),
    })

    return { success: true }
  } catch (error) {
    console.error('Error sending beta confirmation email:', error)
    return { success: false, error }
  }
}

export async function sendBetaInvitationEmail(data: BetaSignupData) {
  try {
    const betaSignupUrl = `${BASE_URL}#beta-signup`

    const bodyHtml =
      toParagraph(`Hey ${escapeHtml(data.name)},`) +
      toParagraph(
        "Great news! You've been moved off the waitlist and invited to join the <strong>ReviewFlo Beta Program</strong>."
      ) +
      `<div style="background:#fef3c7;border-left:4px solid #C9A961;border-radius:8px;padding:18px 20px;margin:8px 0 14px;">
        <p style="margin:0;font-size:15px;line-height:1.6;color:#4A3428;"><strong>Special beta access:</strong> Get onboarded early, share feedback directly with us, and receive launch updates first.</p>
      </div>` +
      toList([
        '<strong>Early Access</strong> - Start before public launch',
        '<strong>Direct Line to the Founder</strong> - Text or email me anytime with feedback',
        '<strong>Shape the Product</strong> - Your feedback directly influences what we build',
        '<strong>Early Access to Features</strong> - Be the first to try new capabilities',
        `<strong>Personalized Setup</strong> - I'll help you get ${escapeHtml(
          data.businessName
        )} up and running`,
      ]) +
      toParagraph(
        `This invitation is specifically for ${escapeHtml(
          data.businessName
        )}. The beta program is limited to 20 businesses, so claim your spot soon!`
      ) +
      toParagraph('Questions? Just reply to this email - I read every message.') +
      toParagraph(
        'Looking forward to working with you!<br><br>Jeremy<br>Founder, ReviewFlo<br><a href="mailto:jeremy@usereviewflo.com" style="color:#4A3428;">jeremy@usereviewflo.com</a>'
      )

    await resend.emails.send({
      from: 'Jeremy at ReviewFlo <jeremy@usereviewflo.com>',
      to: data.email,
      subject: 'Your ReviewFlo beta invitation',
      html: renderProEmailShell({
        title: 'ReviewFlo beta invitation',
        eyebrow: "You've been selected for early access",
        bodyHtml,
        ctaLabel: 'Complete Beta Signup',
        ctaUrl: betaSignupUrl,
        footerNote: 'ReviewFlo - Stop bad reviews before they go public.',
      }),
    })

    return { success: true }
  } catch (error) {
    console.error('Error sending beta invitation email:', error)
    return { success: false, error }
  }
}

export async function sendWaitlistConfirmationEmail(data: WaitlistSignupData) {
  try {
    const bodyHtml =
      toParagraph('Hey there,') +
      toParagraph('Thanks for joining the ReviewFlo waitlist!') +
      toParagraph("We'll email you when ReviewFlo launches in the coming weeks.") +
      `<div style="background:#fef3c7;border-left:4px solid #C9A961;border-radius:8px;padding:18px 20px;margin:8px 0 14px;">
        <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#4A3428;"><strong>Want to skip the line?</strong><br>Join our beta program to get early onboarding and direct support while spots are open.</p>
        <a href="https://usereviewflo.com#beta-signup" style="display:inline-block;background:#4A3428;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:999px;font-size:14px;font-weight:600;">Join Beta Program</a>
      </div>` +
      toParagraph("In the meantime, I'll send product updates and practical review tips.") +
      toParagraph(
        'Thanks for your interest!<br><br>Jeremy<br>Founder, ReviewFlo<br><a href="mailto:jeremy@usereviewflo.com" style="color:#4A3428;">jeremy@usereviewflo.com</a>'
      )

    await resend.emails.send({
      from: 'Jeremy at ReviewFlo <jeremy@usereviewflo.com>',
      to: data.email,
      subject: "You're on the ReviewFlo waitlist",
      html: renderProEmailShell({
        title: "You're on the Waitlist",
        eyebrow: 'Thanks for signing up',
        bodyHtml,
        footerNote: 'ReviewFlo - Stop bad reviews before they go public.',
        unsubscribeUrl: `${BASE_URL}/api/unsubscribe`,
      }),
    })

    return { success: true }
  } catch (error) {
    console.error('Error sending waitlist confirmation email:', error)
    return { success: false, error }
  }
}

export async function sendQualificationEmail(data: QualificationData) {
  try {
    const surveyPageUrl = 'https://usereviewflo.com/survey'
    const bodyHtml =
      toParagraph('Hi there,') +
      toParagraph('Thanks for your interest in ReviewFlo!') +
      toParagraph('<strong>Quick reminder of what ReviewFlo does:</strong>') +
      toList([
        'Send review requests via a simple link after each job',
        'Make it effortless for happy customers to leave 5-star Google reviews',
        'Catch unhappy customers privately so you can fix issues before they post',
      ]) +
      `<div style="background:#fef3c7;border-left:4px solid #C9A961;border-radius:8px;padding:18px 20px;margin:8px 0 14px;">
        <p style="margin:0;font-size:15px;line-height:1.6;color:#4A3428;"><strong>Next step:</strong> Please complete this short survey (3 minutes) so we can select the right beta testers.</p>
      </div>` +
      toParagraph(
        "We'll review all responses and contact you within 7 days if you're selected."
      ) +
      toParagraph('Questions? Just reply to this email.<br><br>- Jeremy<br>Founder, ReviewFlo')

    await resend.emails.send({
      from: 'Jeremy at ReviewFlo <jeremy@usereviewflo.com>',
      to: data.email,
      subject: 'ReviewFlo beta survey (3 minutes)',
      html: renderProEmailShell({
        title: 'ReviewFlo Beta Survey',
        eyebrow: `For ${escapeHtml(data.businessType || 'your business')}`,
        bodyHtml,
        ctaLabel: 'Complete Beta Survey',
        ctaUrl: surveyPageUrl,
        footerNote: 'ReviewFlo - Stop bad reviews before they go public.',
      }),
    })

    return { success: true }
  } catch (error) {
    console.error('Error sending qualification email:', error)
    return { success: false, error }
  }
}

function adminDataTable(rows: Array<{ label: string; value: unknown }>): string {
  const body = rows
    .map(
      row =>
        `<tr>
          <td style="padding:8px 10px 8px 0;font-size:13px;color:#6b5d52;vertical-align:top;"><strong>${escapeHtml(
            row.label
          )}</strong></td>
          <td style="padding:8px 0;font-size:14px;color:#4A3428;vertical-align:top;">${escapeHtmlMaybe(
            row.value
          )}</td>
        </tr>`
    )
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 10px;">${body}</table>`
}

export async function sendAdminNotification(
  type: 'beta' | 'waitlist' | 'qualify' | 'early_access' | 'early_access_beta' | 'signup',
  data: Record<string, unknown>
) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('[sendAdminNotification] RESEND_API_KEY is not set')
      return { success: false, error: 'Email service not configured' }
    }

    const isBeta = type === 'beta'
    const isQualify = type === 'qualify'
    const isEarlyAccess = type === 'early_access'
    const isEarlyAccessBeta = type === 'early_access_beta'
    const isSignup = type === 'signup'

    const subject = isBeta
      ? `New Beta Signup: ${data.businessName || 'N/A'}`
      : isQualify
      ? `New Beta Signup: ${data.businessName || 'N/A'}`
      : isEarlyAccess
      ? `New Early Access Payment: ${data.email}`
      : isEarlyAccessBeta
      ? `New Free Beta Signup: ${data.email}`
      : isSignup
      ? `New Signup: ${data.businessName || data.email || 'N/A'}`
      : 'New Waitlist Signup'

    const adminEmailsRaw = process.env.ADMIN_EMAILS?.trim()
    const adminTo = adminEmailsRaw
      ? adminEmailsRaw.split(',').map(e => e.trim()).filter(Boolean)
      : [process.env.ADMIN_EMAIL || 'jeremy.elucidation@gmail.com', 'jeremy@usereviewflo.com'].filter(
          (email, index, all) => all.indexOf(email) === index
        )

    if (adminTo.length === 0) {
      console.error('[sendAdminNotification] No admin emails configured')
      return { success: false, error: 'No admin emails' }
    }

    let bodyHtml = ''

    if (isEarlyAccessBeta) {
      bodyHtml =
        adminDataTable([
          { label: 'Email', value: data.email },
          { label: 'Name', value: data.fullName },
          { label: 'Business Type', value: data.businessType },
          { label: 'Customers/Month', value: data.customersPerMonth },
          { label: 'Review Frequency', value: data.reviewAskingFrequency },
          { label: 'Welcome Email', value: data.emailSent ? 'Sent' : 'Failed' },
        ]) + toParagraph('Next step: Create their business in Admin -> Early Access, then send login details.')
    } else if (isEarlyAccess) {
      const amount =
        typeof data.amountCents === 'number' ? `$${(data.amountCents / 100).toFixed(2)}` : '$10.00'
      bodyHtml =
        adminDataTable([
          { label: 'Email', value: data.email },
          { label: 'Name', value: data.fullName },
          { label: 'Amount', value: amount },
          { label: 'Business Type', value: data.businessType },
          { label: 'Welcome Email', value: data.customerEmailSent ? 'Sent' : 'May have failed' },
        ]) + toParagraph('Payment captured and account onboarding email flow has been triggered.')
    } else if (isQualify) {
      const slug = String(data.slug || '').trim()
      const reviewLink = slug ? `https://usereviewflo.com/${slug}` : 'N/A'
      bodyHtml =
        adminDataTable([
          { label: 'Business', value: data.businessName },
          { label: 'Type', value: data.businessType },
          { label: 'Email', value: data.email },
          { label: 'Slug', value: slug || 'N/A' },
          { label: 'Review Link', value: reviewLink },
          { label: 'Customers/Month', value: data.customersPerMonth },
          { label: 'Review Frequency', value: data.reviewAskingFrequency },
        ]) +
        toParagraph(
          `Signed up: ${new Date().toLocaleString('en-US', {
            timeZone: 'America/Denver',
            dateStyle: 'medium',
            timeStyle: 'short',
          })}`
        )
    } else if (isBeta) {
      bodyHtml =
        adminDataTable([
          { label: 'Name', value: data.name },
          { label: 'Email', value: data.email },
          { label: 'Phone', value: data.phone },
          { label: 'Business', value: data.businessName },
          { label: 'Type', value: data.businessType },
          { label: 'Challenge', value: data.challenge || 'N/A' },
        ]) +
        `<div style="background:#fef3c7;border-left:4px solid #C9A961;border-radius:8px;padding:14px 16px;margin:10px 0 0;">
          <p style="margin:0;font-size:14px;line-height:1.6;color:#4A3428;"><strong>Action required:</strong> Text ${escapeHtmlMaybe(
            data.phone
          )} within 24 hours to set them up.</p>
        </div>`
    } else if (isSignup) {
      const slug = String(data.slug || '').trim()
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'
      bodyHtml =
        adminDataTable([
          { label: 'Name', value: data.name },
          { label: 'Email', value: data.email },
          { label: 'Business', value: data.businessName },
          { label: 'Review Link', value: slug ? `${appUrl}/${slug}` : 'N/A' },
          { label: 'Method', value: data.signupMethod || 'Google' },
        ]) +
        toParagraph(
          `Signed up: ${new Date().toLocaleString('en-US', {
            timeZone: 'America/Denver',
            dateStyle: 'medium',
            timeStyle: 'short',
          })}`
        )
    } else {
      bodyHtml = adminDataTable([
        { label: 'Email', value: data.email },
        { label: 'Business Name', value: data.businessName },
        { label: 'Business Type', value: data.businessType || 'N/A' },
      ])
    }

    bodyHtml += `<p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#6b5d52;">Admin dashboard: <a href="${BASE_URL}/admin" style="color:#4A3428;">${BASE_URL}/admin</a></p>`

    const emailHtml = renderProEmailShell({
      title: subject,
      eyebrow: 'Admin notification',
      bodyHtml,
      footerNote: 'ReviewFlo internal notification',
    })

    const batchPayload = adminTo.map(email => ({
      from: 'Jeremy at ReviewFlo <jeremy@usereviewflo.com>' as const,
      to: [email],
      subject,
      html: emailHtml,
    }))
    const result =
      adminTo.length === 1
        ? await resend.emails.send(batchPayload[0])
        : await resend.batch.send(batchPayload)

    if (result.error) {
      console.error('[sendAdminNotification] Resend error:', result.error)
      return { success: false, error: result.error }
    }
    console.log(
      '[sendAdminNotification] Sent to',
      adminTo.join(', '),
      adminTo.length === 1 ? `id: ${result.data?.id}` : ''
    )
    return { success: true }
  } catch (error) {
    console.error('[sendAdminNotification] Error:', error)
    return { success: false, error }
  }
}

export interface ReviewRequestEmailData {
  customerName: string
  customerEmail: string
  businessName: string
  ownerName: string
  reviewLink: string
  trackingToken?: string | null
  optionalNote?: string | null
}

export async function sendReviewRequestEmail(data: ReviewRequestEmailData) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('[sendReviewRequestEmail] RESEND_API_KEY is not set')
      return { success: false, error: 'Email service not configured' }
    }

    const ctaHref = data.trackingToken ? `${BASE_URL}/api/track/click?t=${data.trackingToken}` : data.reviewLink
    const noteHtml = data.optionalNote
      ? `<div style="background:#f8f4ee;border-left:4px solid #C9A961;border-radius:8px;padding:14px 16px;margin:8px 0 14px;"><p style="margin:0;font-size:14px;line-height:1.6;color:#4A3428;">${escapeHtml(
          data.optionalNote
        )}</p></div>`
      : ''

    const bodyHtml =
      toParagraph(`Hi ${escapeHtml(data.customerName)},`) +
      toParagraph(`Thanks for choosing ${escapeHtml(data.businessName)}!`) +
      toParagraph("We'd love to hear about your experience. Could you take 30 seconds to share your feedback?") +
      noteHtml +
      toParagraph('Your feedback helps us improve and serve you better.') +
      toParagraph(
        `Thanks,<br>${escapeHtml(data.ownerName)}<br>${escapeHtml(data.businessName)}`
      )

    const { data: result, error } = await resend.emails.send({
      from: REVIEW_REQUEST_FROM,
      to: data.customerEmail,
      subject: `How was your experience with ${data.businessName}?`,
      html: renderProEmailShell({
        title: `How was your experience with ${escapeHtml(data.businessName)}?`,
        eyebrow: 'Quick feedback request',
        bodyHtml,
        ctaLabel: 'Rate Your Experience',
        ctaUrl: ctaHref,
        footerNote: 'Powered by ReviewFlo',
      }),
      headers: getListUnsubscribeHeaders(),
    })

    if (error) {
      console.error('[sendReviewRequestEmail] Resend error:', error)
      return { success: false, error }
    }
    return { success: true, id: result?.id }
  } catch (error) {
    console.error('[sendReviewRequestEmail] Error:', error)
    return { success: false, error }
  }
}

export interface ReviewReminderEmailData {
  customerName: string
  customerEmail: string
  businessName: string
  reviewLink: string
  trackingToken?: string | null
}

export async function sendReviewReminderEmail(data: ReviewReminderEmailData) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('[sendReviewReminderEmail] RESEND_API_KEY is not set')
      return { success: false, error: 'Email service not configured' }
    }

    const ctaHref = data.trackingToken ? `${BASE_URL}/api/track/click?t=${data.trackingToken}` : data.reviewLink
    const bodyHtml =
      toParagraph(`Hi ${escapeHtml(data.customerName)},`) +
      toParagraph(
        `Just a quick reminder - we'd still love to hear about your experience with ${escapeHtml(
          data.businessName
        )}.`
      ) +
      toParagraph('Takes 30 seconds and helps us improve.') +
      toParagraph(`Thanks,<br>${escapeHtml(data.businessName)}`)

    const { data: result, error } = await resend.emails.send({
      from: REVIEW_REQUEST_FROM,
      to: data.customerEmail,
      subject: `Quick reminder: Feedback for ${data.businessName}`,
      html: renderProEmailShell({
        title: `Quick reminder from ${escapeHtml(data.businessName)}`,
        eyebrow: 'Friendly follow-up',
        bodyHtml,
        ctaLabel: 'Share Your Feedback',
        ctaUrl: ctaHref,
        footerNote: 'Powered by ReviewFlo',
      }),
      headers: getListUnsubscribeHeaders(),
    })

    if (error) {
      console.error('[sendReviewReminderEmail] Resend error:', error)
      return { success: false, error }
    }
    return { success: true, id: result?.id }
  } catch (error) {
    console.error('[sendReviewReminderEmail] Error:', error)
    return { success: false, error }
  }
}

export interface ProLaunchEmailData {
  email: string
  unsubscribeUrl?: string
}

export async function sendProLaunchEmail(data: ProLaunchEmailData) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('[sendProLaunchEmail] RESEND_API_KEY is not set')
      return { success: false, error: 'Email service not configured' }
    }

    const unsubUrl = data.unsubscribeUrl ?? `${BASE_URL}/unsubscribe`
    const ctaUrl = `${BASE_URL}/settings?tab=plan`
    const bodyHtml =
      toParagraph('Everything you need to turn every customer into a review.') +
      toList([
        '<strong>Google Business Profile, connected</strong> - See and reply to your Google reviews right in the dashboard.',
        '<strong>Automated follow-ups</strong> - Set it and forget it. ReviewFlo sends the right message at the right time.',
        '<strong>Multi-location support</strong> - Pro supports up to 3 locations from a single account.',
      ]) +
      `<div style="background:#fef3c7;border-left:4px solid #C9A961;border-radius:8px;padding:18px 20px;margin:8px 0 14px;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#4A3428;opacity:0.7;">Launch pricing</p>
        <p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;color:#4A3428;line-height:1;">$9.50<span style="font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:500;color:#6b5d52;">/mo</span> <span style="font-size:17px;color:#6b5d52;text-decoration:line-through;margin-left:8px;">$19/mo</span></p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#4A3428;">$9.50/mo for your first 3 months. Then $19/mo. <strong>Lock in the rate before it ends.</strong></p>
      </div>` +
      toParagraph('No credit card surprises. Cancel anytime.')

    const { data: result, error } = await resend.emails.send({
      from: 'Jeremy at ReviewFlo <jeremy@usereviewflo.com>',
      to: data.email,
      subject: 'ReviewFlo Pro is here',
      html: renderProEmailShell({
        title: 'ReviewFlo Pro is here.',
        eyebrow: 'Now available - Pro',
        bodyHtml,
        ctaLabel: 'Start Pro for $9.50',
        ctaUrl,
        unsubscribeUrl: unsubUrl,
      }),
      headers: {
        'List-Unsubscribe': `<${unsubUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    })

    if (error) {
      console.error('[sendProLaunchEmail] Resend error:', error)
      return { success: false, error }
    }
    return { success: true, id: result?.id }
  } catch (error) {
    console.error('[sendProLaunchEmail] Error:', error)
    return { success: false, error }
  }
}

export interface CampaignEmailData {
  to: string
  firstName: string | null
  businessName: string
  template: string
  reviewLink: string
  trackingToken: string
  unsubscribeUrl: string
}

function renderCampaignTemplate(
  template: string,
  vars: { firstName: string | null; businessName: string; reviewLink: string; unsubscribeUrl: string }
): string {
  const firstName = vars.firstName?.trim() || 'there'
  return template
    .replace(/\{first_name\}/g, firstName)
    .replace(/\{business_name\}/g, vars.businessName)
    .replace(/\{google_review_link\}/g, vars.reviewLink)
    .replace(/\{review_link\}/g, vars.reviewLink)
    .replace(/\{unsubscribe_link\}/g, vars.unsubscribeUrl)
}

export async function sendCampaignEmail(data: CampaignEmailData) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('[sendCampaignEmail] RESEND_API_KEY is not set')
      return { success: false, error: 'Email service not configured' }
    }

    const ctaHref = `${BASE_URL}/api/campaigns/track-click?t=${data.trackingToken}`
    const renderedText = renderCampaignTemplate(data.template, {
      firstName: data.firstName,
      businessName: data.businessName,
      reviewLink: ctaHref,
      unsubscribeUrl: data.unsubscribeUrl,
    })

    const escaped = escapeHtml(renderedText)
    const linked = escaped
      .replace(
        new RegExp(escapeHtml(ctaHref).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        `<a href="${ctaHref}" style="display:inline-block;background:#4A3428;color:#ffffff !important;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600;">Leave a Google review</a>`
      )
      .replace(
        new RegExp(escapeHtml(data.unsubscribeUrl).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        `<a href="${data.unsubscribeUrl}" style="color:#4A3428;">Unsubscribe</a>`
      )

    const bodyHtml = `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#6b5d52;">${linked.replace(
      /\n/g,
      '<br>'
    )}</p>`

    const { data: result, error } = await resend.emails.send({
      from: REVIEW_REQUEST_FROM,
      to: data.to,
      subject: `A quick favor from ${data.businessName}`,
      html: renderProEmailShell({
        title: `A quick favor from ${escapeHtml(data.businessName)}`,
        eyebrow: 'Customer outreach',
        bodyHtml,
        unsubscribeUrl: data.unsubscribeUrl,
      }),
      headers: {
        'List-Unsubscribe': `<${data.unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    })

    if (error) {
      console.error('[sendCampaignEmail] Resend error:', error)
      return { success: false, error }
    }
    return { success: true, id: result?.id }
  } catch (error) {
    console.error('[sendCampaignEmail] Error:', error)
    return { success: false, error }
  }
}
