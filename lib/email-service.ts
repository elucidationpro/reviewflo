import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface BetaSignupData {
  name: string;
  email: string;
  businessName: string;
}

interface WaitlistSignupData {
  email: string;
}

interface QualificationData {
  email: string;
  businessType: string;
}

interface EarlyAccessBetaWelcomeData {
  email: string;
  fullName: string;
  businessType: string;
}

export async function sendEarlyAccessBetaWelcomeEmail(data: EarlyAccessBetaWelcomeData) {
  try {
    await resend.emails.send({
      from: 'Jeremy at ReviewFlo <jeremy@usereviewflo.com>',
      to: data.email,
      subject: "You're In! ReviewFlo Free Beta",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4A3428; color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .benefit { margin: 12px 0; }
            .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">You're in! Welcome to ReviewFlo Free Beta</h1>
            </div>
            <div class="content">
              <p>Hey ${data.fullName || 'there'},</p>

              <p>Thanks for joining the ReviewFlo beta! You're using it <strong>free until April 2026</strong>—no payment, no contracts.</p>

              <p><strong>What happens next:</strong> I'll reach out within 24 hours to get your ${data.businessType || 'business'} set up. The whole process takes about 10 minutes.</p>

              <p>As a beta tester you get:</p>
              <ul>
                <li>✓ Free access until April 2026</li>
                <li>✓ 50% off first 3 months at launch ($9.50 or $24.50/mo)</li>
                <li>✓ Direct line to me (Jeremy) for support</li>
                <li>✓ Help shape the product</li>
              </ul>

              <p>Questions? Just reply to this email.</p>

              <p>Jeremy<br>
              Founder, ReviewFlo<br>
              <a href="mailto:jeremy@usereviewflo.com">jeremy@usereviewflo.com</a></p>
            </div>
            <div class="footer">
              <p>ReviewFlo • Stop bad reviews before they go public</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending early access beta welcome email:', error);
    return { success: false, error };
  }
}

export async function sendBetaConfirmationEmail(data: BetaSignupData) {
  try {
    await resend.emails.send({
      from: 'Jeremy at ReviewFlo <jeremy@usereviewflo.com>',
      to: data.email,
      subject: "You're In! Welcome to ReviewFlo Beta",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .benefit { display: flex; align-items: start; margin: 15px 0; }
            .benefit-icon { color: #10b981; margin-right: 10px; font-size: 20px; }
            .cta { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">Welcome to ReviewFlo Beta!</h1>
            </div>
            <div class="content">
              <p>Hey ${data.name},</p>

              <p>Thanks for joining the ReviewFlo beta program! 🎉</p>

              <p><strong>I'll text you within 24 hours</strong> to learn about ${data.businessName} and get your review page set up. The whole process takes about 10 minutes.</p>

              <p>As a beta tester, you get:</p>

              <div class="benefit">
                <span class="benefit-icon">✓</span>
                <div><strong>Lifetime free access</strong> – Never pay a subscription fee</div>
              </div>
              <div class="benefit">
                <span class="benefit-icon">✓</span>
                <div><strong>Direct feedback line</strong> – Text or email me anytime</div>
              </div>
              <div class="benefit">
                <span class="benefit-icon">✓</span>
                <div><strong>Shape the product</strong> – Your feedback drives development</div>
              </div>
              <div class="benefit">
                <span class="benefit-icon">✓</span>
                <div><strong>Early access</strong> – First to see new features</div>
              </div>

              <p>In the meantime, feel free to reply to this email with any questions or thoughts about what you'd like to see in ReviewFlo.</p>

              <p>Talk soon!</p>

              <p>Jeremy<br>
              Founder, ReviewFlo<br>
              <a href="mailto:jeremy@usereviewflo.com">jeremy@usereviewflo.com</a></p>
            </div>
            <div class="footer">
              <p>ReviewFlo • Built for small business owners, by a small business owner</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending beta confirmation email:', error);
    return { success: false, error };
  }
}

export async function sendBetaInvitationEmail(data: BetaSignupData) {
  try {
    const betaSignupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'}#beta-signup`;

    await resend.emails.send({
      from: 'Jeremy at ReviewFlo <jeremy@usereviewflo.com>',
      to: data.email,
      subject: "You're Invited to Join ReviewFlo Beta",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .benefit { display: flex; align-items: start; margin: 15px 0; }
            .benefit-icon { color: #10b981; margin-right: 10px; font-size: 20px; }
            .cta { background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; font-weight: 600; font-size: 16px; }
            .highlight-box { background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; }
            .what-to-expect { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">🎉 Congratulations!</h1>
              <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.95;">You've been selected for the ReviewFlo Beta Program</p>
            </div>
            <div class="content">
              <p>Hey ${data.name},</p>

              <p>Great news! You've been moved off the waitlist and invited to join the <strong>ReviewFlo Beta Program</strong>.</p>

              <div class="highlight-box">
                <p style="margin: 0; color: #92400e; font-size: 16px;"><strong>🎁 Special Beta Offer:</strong></p>
                <p style="margin: 10px 0 0 0; color: #92400e; font-size: 15px;">Get <strong>lifetime free access</strong> to ReviewFlo by joining the beta program. No credit card required, no subscription fees, ever.</p>
              </div>

              <h3 style="color: #1f2937; margin-top: 25px;">What You Get as a Beta Tester:</h3>

              <div class="benefit">
                <span class="benefit-icon">✓</span>
                <div><strong>Lifetime Free Access</strong> – Never pay a subscription fee</div>
              </div>
              <div class="benefit">
                <span class="benefit-icon">✓</span>
                <div><strong>Direct Line to the Founder</strong> – Text or email me anytime with feedback</div>
              </div>
              <div class="benefit">
                <span class="benefit-icon">✓</span>
                <div><strong>Shape the Product</strong> – Your feedback directly influences what we build</div>
              </div>
              <div class="benefit">
                <span class="benefit-icon">✓</span>
                <div><strong>Early Access to Features</strong> – Be the first to try new capabilities</div>
              </div>
              <div class="benefit">
                <span class="benefit-icon">✓</span>
                <div><strong>Personalized Setup</strong> – I'll help you get ${data.businessName} up and running</div>
              </div>

              <div class="what-to-expect">
                <h3 style="color: #0c4a6e; margin-top: 0;">What to Expect:</h3>
                <ol style="color: #0c4a6e; margin: 10px 0; padding-left: 20px;">
                  <li style="margin-bottom: 8px;"><strong>Complete the beta signup form</strong> (takes 2 minutes)</li>
                  <li style="margin-bottom: 8px;"><strong>I'll text you within 24 hours</strong> to set up your review page</li>
                  <li style="margin-bottom: 8px;"><strong>Start using ReviewFlo</strong> to manage your reviews</li>
                  <li style="margin-bottom: 8px;"><strong>Share feedback</strong> as you use the product</li>
                </ol>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${betaSignupUrl}" class="cta">
                  Complete Beta Signup →
                </a>
              </div>

              <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 20px;">
                This invitation is specifically for ${data.businessName}. The beta program is limited to 20 businesses, so claim your spot soon!
              </p>

              <p style="margin-top: 30px;">Questions? Just reply to this email – I read every message.</p>

              <p>Looking forward to working with you!</p>

              <p>Jeremy<br>
              Founder, ReviewFlo<br>
              <a href="mailto:jeremy@usereviewflo.com">jeremy@usereviewflo.com</a></p>
            </div>
            <div class="footer">
              <p>ReviewFlo • Built for small business owners, by a small business owner</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending beta invitation email:', error);
    return { success: false, error };
  }
}

export async function sendWaitlistConfirmationEmail(data: WaitlistSignupData) {
  try {
    await resend.emails.send({
      from: 'Jeremy at ReviewFlo <jeremy@usereviewflo.com>',
      to: data.email,
      subject: "You're on the ReviewFlo Waitlist",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1f2937 0%, #111827 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .cta { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 14px; }
            .highlight { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">You're on the Waitlist!</h1>
            </div>
            <div class="content">
              <p>Hey there,</p>

              <p>Thanks for joining the ReviewFlo waitlist!</p>

              <p>We'll email you when ReviewFlo launches in the coming weeks.</p>

              <div class="highlight">
                <strong>💡 Want to skip the line?</strong><br>
                Join our beta program and get <strong>lifetime free access</strong>. We're looking for 20 businesses to help test ReviewFlo before launch.
                <br><br>
                <a href="https://usereviewflo.com#beta-signup" class="cta">Join Beta Program →</a>
              </div>

              <p>In the meantime, I'll send you weekly tips on handling reviews and updates on ReviewFlo's progress.</p>

              <p>Thanks for your interest!</p>

              <p>Jeremy<br>
              Founder, ReviewFlo<br>
              <a href="mailto:jeremy@usereviewflo.com">jeremy@usereviewflo.com</a></p>
            </div>
            <div class="footer">
              <p>ReviewFlo • Built for small business owners, by a small business owner</p>
              <p style="font-size: 12px; margin-top: 10px;">
                Don't want these emails? <a href="{{{UNSUBSCRIBE_URL}}}" style="color: #6b7280;">Unsubscribe</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending waitlist confirmation email:', error);
    return { success: false, error };
  }
}

export async function sendQualificationEmail(data: QualificationData) {
  try {
    const surveyPageUrl = 'https://usereviewflo.com/survey';

    await resend.emails.send({
      from: 'Jeremy at ReviewFlo <jeremy@usereviewflo.com>',
      to: data.email,
      subject: "ReviewFlo Beta Survey - One More Step (3 minutes)",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4A3428 0%, #3a2a20 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .cta { background: #4A3428; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; font-weight: 600; font-size: 16px; }
            .cta:hover { background: #3a2a20; }
            .highlight-box { background: rgba(201, 169, 97, 0.2); padding: 20px; border-radius: 8px; border-left: 4px solid #C9A961; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 14px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">ReviewFlo Beta Survey</h1>
            </div>
            <div class="content">
              <p>Hi there,</p>

              <p>Thanks for your interest in ReviewFlo!</p>

              <p><strong>Quick reminder of what ReviewFlo does:</strong></p>
              <ul style="color: #4b5563; line-height: 1.8;">
                <li>Send review requests via a simple link after each job</li>
                <li>Make it effortless for happy customers to leave 5-star Google reviews</li>
                <li>Catch unhappy customers privately so you can fix issues before they post</li>
              </ul>

              <div class="highlight-box">
                <p style="margin: 0; font-size: 16px;"><strong>Next step:</strong></p>
                <p style="margin: 10px 0 0 0; font-size: 15px;">Please complete this short survey (3 minutes) so we can select the right beta testers.</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${surveyPageUrl}" class="cta">
                  Complete Beta Survey →
                </a>
              </div>

              <p style="color: #6b7280; font-size: 14px;">We'll review all responses and contact you within 7 days if you're selected.</p>

              <p style="margin-top: 30px;">Questions? Just reply to this email.</p>

              <p>— Jeremy<br>
              Founder, ReviewFlo</p>
            </div>
            <div class="footer">
              <p>ReviewFlo • Built for small business owners, by a small business owner</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending qualification email:', error);
    return { success: false, error };
  }
}

export async function sendAdminNotification(type: 'beta' | 'waitlist' | 'qualify' | 'early_access' | 'early_access_beta' | 'signup', data: Record<string, unknown>) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('[sendAdminNotification] RESEND_API_KEY is not set');
      return { success: false, error: 'Email service not configured' };
    }
    const isBeta = type === 'beta';
    const isQualify = type === 'qualify';
    const isEarlyAccess = type === 'early_access';
    const isEarlyAccessBeta = type === 'early_access_beta';
    const isSignup = type === 'signup';
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
      : 'New Waitlist Signup';

    // Explicit list: ADMIN_EMAILS overrides (comma-separated). Otherwise both default admin addresses.
    const adminEmailsRaw = process.env.ADMIN_EMAILS?.trim();
    const adminTo = adminEmailsRaw
      ? adminEmailsRaw.split(',').map(e => e.trim()).filter(Boolean)
      : [
          process.env.ADMIN_EMAIL || 'jeremy.elucidation@gmail.com',
          'jeremy@usereviewflo.com',
        ].filter((e, i, a) => a.indexOf(e) === i) as string[];

    if (adminTo.length === 0) {
      console.error('[sendAdminNotification] No admin emails configured');
      return { success: false, error: 'No admin emails' };
    }

    const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .info-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
            .info-table td:first-child { font-weight: 600; color: #374151; width: 140px; }
            .info-table td:last-child { color: #1f2937; }
            .cta-button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
            .action-needed { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">${isBeta ? '🎉 New Beta Signup!' : isQualify ? 'New ReviewFlo beta signup' : isEarlyAccess ? '💰 New Early Access Payment' : isEarlyAccessBeta ? '🆓 New Free Beta Signup' : isSignup ? '🆕 New Account Signup!' : '📋 New Waitlist Signup'}</h1>
            </div>
            <div class="content">
              ${isEarlyAccessBeta ? `
                <table class="info-table">
                  <tr>
                    <td>Email:</td>
                    <td><a href="mailto:${data.email}" style="color: #2563eb;">${data.email}</a></td>
                  </tr>
                  <tr>
                    <td>Name:</td>
                    <td><strong>${data.fullName || 'N/A'}</strong></td>
                  </tr>
                  <tr>
                    <td>Business Type:</td>
                    <td>${data.businessType || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Customers/Month:</td>
                    <td>${data.customersPerMonth || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Review Frequency:</td>
                    <td>${data.reviewAskingFrequency || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Welcome Email:</td>
                    <td>${data.emailSent ? '<span style="color: #10b981;">✓ Sent</span>' : '<span style="color: #ef4444;">✗ Failed</span>'}</td>
                  </tr>
                </table>
                <p><strong>Next step:</strong> Create their business in Admin → Early Access, then send them login details.</p>
              ` : isEarlyAccess ? `
                <table class="info-table">
                  <tr>
                    <td>Email:</td>
                    <td><a href="mailto:${data.email}" style="color: #2563eb;">${data.email}</a></td>
                  </tr>
                  <tr>
                    <td>Name:</td>
                    <td><strong>${data.fullName || 'N/A'}</strong></td>
                  </tr>
                  <tr>
                    <td>Amount:</td>
                    <td><strong>$${typeof data.amountCents === 'number' ? (data.amountCents / 100).toFixed(2) : '10.00'}</strong></td>
                  </tr>
                  <tr>
                    <td>Business Type:</td>
                    <td>${data.businessType || 'N/A'}</td>
                  </tr>
                </table>
                <p>Welcome email ${data.customerEmailSent ? 'was sent' : 'may have failed'} to the customer.</p>
              ` : isQualify ? `
                <h3 style="color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin: 20px 0 10px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
                  BUSINESS
                </h3>
                <table class="info-table">
                  <tr>
                    <td>Name:</td>
                    <td><strong>${data.businessName || 'N/A'}</strong></td>
                  </tr>
                  <tr>
                    <td>Type:</td>
                    <td>${data.businessType || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Email:</td>
                    <td><a href="mailto:${data.email}" style="color: #2563eb;">${data.email}</a></td>
                  </tr>
                  <tr>
                    <td>Slug:</td>
                    <td>${data.slug || 'N/A'}</td>
                  </tr>
                </table>

                <h3 style="color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin: 20px 0 10px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
                  REVIEW LINK
                </h3>
                <p style="margin: 0 0 20px 0;"><a href="https://usereviewflo.com/${data.slug || ''}" style="color: #2563eb;">usereviewflo.com/${data.slug || 'N/A'}</a></p>

                <h3 style="color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin: 20px 0 10px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
                  SURVEY DATA
                </h3>
                <table class="info-table">
                  <tr>
                    <td>Customers/month:</td>
                    <td>${data.customersPerMonth || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Current review frequency:</td>
                    <td>${data.reviewAskingFrequency || 'N/A'}</td>
                  </tr>
                </table>

                <h3 style="color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin: 20px 0 10px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
                  ACCOUNT STATUS
                </h3>
                <p style="margin: 0 0 4px 0; color: #10b981;">✅ Auth user created</p>
                <p style="margin: 0 0 4px 0; color: #10b981;">✅ Business record created</p>
                <p style="margin: 0 0 4px 0; color: #10b981;">✅ Templates created</p>
                <p style="margin: 0 0 20px 0; color: #10b981;">✅ Welcome email sent</p>

                <h3 style="color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin: 20px 0 10px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
                  NEXT STEPS
                </h3>
                <ol style="margin: 0 0 20px 0; padding-left: 20px;">
                  <li style="margin-bottom: 6px;">Verify they received welcome email</li>
                  <li style="margin-bottom: 6px;">Monitor if they activate (send first review request)</li>
                  <li style="margin-bottom: 6px;">Check for bugs/feedback</li>
                </ol>

                <p style="margin: 0; font-size: 13px; color: #6b7280;">
                  <strong>Signed up:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/Denver', dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              ` : isBeta ? `
                <table class="info-table">
                  <tr>
                    <td>Name:</td>
                    <td><strong>${data.name || 'N/A'}</strong></td>
                  </tr>
                  <tr>
                    <td>Email:</td>
                    <td><a href="mailto:${data.email}" style="color: #2563eb;">${data.email}</a></td>
                  </tr>
                  <tr>
                    <td>Phone:</td>
                    <td><a href="tel:${data.phone}" style="color: #2563eb;">${data.phone}</a></td>
                  </tr>
                  <tr>
                    <td>Business Name:</td>
                    <td><strong>${data.businessName || 'N/A'}</strong></td>
                  </tr>
                  <tr>
                    <td>Business Type:</td>
                    <td>${data.businessType || 'N/A'}</td>
                  </tr>
                  ${data.challenge ? `
                    <tr>
                      <td>Challenge:</td>
                      <td><em>${data.challenge}</em></td>
                    </tr>
                  ` : ''}
                </table>

                <div class="action-needed">
                  <strong>⚡ Action Required:</strong><br>
                  Text <a href="tel:${data.phone}" style="color: #92400e; font-weight: bold;">${data.phone}</a> within 24 hours to set them up.
                </div>
              ` : isSignup ? `
                <table class="info-table">
                  <tr>
                    <td>Name:</td>
                    <td><strong>${data.name || 'N/A'}</strong></td>
                  </tr>
                  <tr>
                    <td>Email:</td>
                    <td><a href="mailto:${data.email}" style="color: #2563eb;">${data.email}</a></td>
                  </tr>
                  <tr>
                    <td>Business Name:</td>
                    <td><strong>${data.businessName || 'N/A'}</strong></td>
                  </tr>
                  <tr>
                    <td>Review Link:</td>
                    <td><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'}/${data.slug || ''}" style="color: #2563eb;">usereviewflo.com/${data.slug || 'N/A'}</a></td>
                  </tr>
                  <tr>
                    <td>Method:</td>
                    <td>${data.signupMethod || 'Google'}</td>
                  </tr>
                </table>
                <p style="margin: 0; font-size: 13px; color: #6b7280;">
                  <strong>Signed up:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/Denver', dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              ` : `
                <table class="info-table">
                  <tr>
                    <td>Email:</td>
                    <td><a href="mailto:${data.email}" style="color: #2563eb;">${data.email}</a></td>
                  </tr>
                  <tr>
                    <td>Business Name:</td>
                    <td><strong>${data.businessName || 'N/A'}</strong></td>
                  </tr>
                  ${data.businessType ? `
                    <tr>
                      <td>Business Type:</td>
                      <td>${data.businessType}</td>
                    </tr>
                  ` : ''}
                </table>
              `}


              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'}/admin" class="cta-button">
                  View Admin Dashboard →
                </a>
              </div>
            </div>
            <div class="footer">
              <p>ReviewFlo Admin Notification</p>
            </div>
          </div>
        </body>
        </html>
      `;

    // Send one email per admin (more reliable than single email with multiple To)
    const batchPayload = adminTo.map(email => ({
      from: 'Jeremy at ReviewFlo <jeremy@usereviewflo.com>' as const,
      to: [email],
      subject,
      html: emailHtml,
    }));
    const result = adminTo.length === 1
      ? await resend.emails.send(batchPayload[0])
      : await resend.batch.send(batchPayload);

    if (result.error) {
      console.error('[sendAdminNotification] Resend error:', result.error);
      return { success: false, error: result.error };
    }
    console.log('[sendAdminNotification] Sent to', adminTo.join(', '), adminTo.length === 1 ? `id: ${result.data?.id}` : '');
    return { success: true };
  } catch (error) {
    console.error('[sendAdminNotification] Error:', error);
    return { success: false, error };
  }
}

// --- REVIEW REQUEST EMAILS (Pro tier) ---

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com';
const REVIEW_REQUEST_FROM =
  process.env.REVIEW_REQUEST_FROM ||
  'Jeremy at ReviewFlo <jeremy@usereviewflo.com>';

function getListUnsubscribeHeaders() {
  const oneClickUrl = `${BASE_URL}/api/unsubscribe`;
  const mailto = 'mailto:jeremy@usereviewflo.com?subject=Unsubscribe';
  return {
    'List-Unsubscribe': `<${mailto}>, <${oneClickUrl}>`,
    // Not every provider supports it, but harmless if ignored
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  } as const;
}

export interface ReviewRequestEmailData {
  customerName: string;
  customerEmail: string;
  businessName: string;
  ownerName: string;
  reviewLink: string;
  trackingToken?: string | null;
  optionalNote?: string | null;
}

export async function sendReviewRequestEmail(data: ReviewRequestEmailData) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('[sendReviewRequestEmail] RESEND_API_KEY is not set');
      return { success: false, error: 'Email service not configured' };
    }
    const noteHtml = data.optionalNote
      ? `<p style="margin: 20px 0; padding: 15px; background: #f8fafc; border-left: 4px solid #94a3b8; border-radius: 4px;">${escapeHtml(data.optionalNote)}</p>`
      : '';

    // Route CTA through click tracker so we know the customer engaged
    const ctaHref = data.trackingToken
      ? `${BASE_URL}/api/track/click?t=${data.trackingToken}`
      : data.reviewLink;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .cta { display: inline-block; background: #4A3428; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
          .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <p>Hi ${escapeHtml(data.customerName)},</p>
          <p>Thanks for choosing ${escapeHtml(data.businessName)}!</p>
          <p>We'd love to hear about your experience. Could you take 30 seconds to share your feedback?</p>
          ${noteHtml}
          <p><a href="${ctaHref}" class="cta">Rate Your Experience →</a></p>
          <p>Your feedback helps us improve and serve you better.</p>
          <p>Thanks,<br>${escapeHtml(data.ownerName)}<br>${escapeHtml(data.businessName)}</p>
          <div class="footer">
            <p>Powered by ReviewFlo</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const { data: result, error } = await resend.emails.send({
      // Use a verified sender by default (some providers reject arbitrary "from" names/addresses).
      from: REVIEW_REQUEST_FROM,
      to: data.customerEmail,
      subject: `How was your experience with ${data.businessName}?`,
      html,
      headers: getListUnsubscribeHeaders(),
    });

    if (error) {
      console.error('[sendReviewRequestEmail] Resend error:', error);
      return { success: false, error };
    }
    return { success: true, id: result?.id };
  } catch (error) {
    console.error('[sendReviewRequestEmail] Error:', error);
    return { success: false, error };
  }
}

export interface ReviewReminderEmailData {
  customerName: string;
  customerEmail: string;
  businessName: string;
  reviewLink: string;
  trackingToken?: string | null;
}

export async function sendReviewReminderEmail(data: ReviewReminderEmailData) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('[sendReviewReminderEmail] RESEND_API_KEY is not set');
      return { success: false, error: 'Email service not configured' };
    }
    const ctaHref = data.trackingToken
      ? `${BASE_URL}/api/track/click?t=${data.trackingToken}`
      : data.reviewLink;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .cta { display: inline-block; background: #4A3428; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
          .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <p>Hi ${escapeHtml(data.customerName)},</p>
          <p>Just a quick reminder - we'd still love to hear about your experience with ${escapeHtml(data.businessName)}.</p>
          <p><a href="${ctaHref}" class="cta">Share Your Feedback →</a></p>
          <p>Takes 30 seconds and helps us improve.</p>
          <p>Thanks,<br>${escapeHtml(data.businessName)}</p>
          <div class="footer">
            <p>Powered by ReviewFlo</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const { data: result, error } = await resend.emails.send({
      from: REVIEW_REQUEST_FROM,
      to: data.customerEmail,
      subject: `Quick reminder: Feedback for ${data.businessName}`,
      html,
      headers: getListUnsubscribeHeaders(),
    });

    if (error) {
      console.error('[sendReviewReminderEmail] Resend error:', error);
      return { success: false, error };
    }
    return { success: true, id: result?.id };
  } catch (error) {
    console.error('[sendReviewReminderEmail] Error:', error);
    return { success: false, error };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- PAST CUSTOMER CAMPAIGN EMAILS ---

export interface CampaignEmailData {
  to: string;
  firstName: string | null;
  businessName: string;
  template: string;          // owner-editable plain-text template
  reviewLink: string;        // CTA destination after click tracker
  trackingToken: string;     // for click tracking
  unsubscribeUrl: string;    // signed URL
}

function renderCampaignTemplate(
  template: string,
  vars: { firstName: string | null; businessName: string; reviewLink: string; unsubscribeUrl: string }
): string {
  const firstName = vars.firstName?.trim() || 'there';
  return template
    .replace(/\{first_name\}/g, firstName)
    .replace(/\{business_name\}/g, vars.businessName)
    .replace(/\{google_review_link\}/g, vars.reviewLink)
    .replace(/\{review_link\}/g, vars.reviewLink)
    .replace(/\{unsubscribe_link\}/g, vars.unsubscribeUrl);
}

export async function sendCampaignEmail(data: CampaignEmailData) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('[sendCampaignEmail] RESEND_API_KEY is not set');
      return { success: false, error: 'Email service not configured' };
    }

    const ctaHref = `${BASE_URL}/api/campaigns/track-click?t=${data.trackingToken}`;

    const renderedText = renderCampaignTemplate(data.template, {
      firstName: data.firstName,
      businessName: data.businessName,
      reviewLink: ctaHref,
      unsubscribeUrl: data.unsubscribeUrl,
    });

    // Convert plain-text body to HTML: escape, replace explicit URLs with anchor
    // tags, then convert newlines to <br>.
    const escaped = escapeHtml(renderedText);
    const linked = escaped
      // Style the CTA URL as a button when it appears in the template body.
      .replace(
        new RegExp(escapeHtml(ctaHref).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        `<a href="${ctaHref}" class="cta">Leave a Google review →</a>`
      )
      // Linkify the unsubscribe URL.
      .replace(
        new RegExp(escapeHtml(data.unsubscribeUrl).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        `<a href="${data.unsubscribeUrl}">Unsubscribe</a>`
      );
    const bodyHtml = linked.replace(/\n/g, '<br>');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .cta { display: inline-block; background: #4A3428; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 16px 0; font-weight: 600; }
          .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <p>${bodyHtml}</p>
          <div class="footer">
            <p>Powered by ReviewFlo</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const { data: result, error } = await resend.emails.send({
      from: REVIEW_REQUEST_FROM,
      to: data.to,
      subject: `A quick favor from ${data.businessName}`,
      html,
      headers: {
        'List-Unsubscribe': `<${data.unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });

    if (error) {
      console.error('[sendCampaignEmail] Resend error:', error);
      return { success: false, error };
    }
    return { success: true, id: result?.id };
  } catch (error) {
    console.error('[sendCampaignEmail] Error:', error);
    return { success: false, error };
  }
}
