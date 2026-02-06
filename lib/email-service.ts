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

export async function sendBetaConfirmationEmail(data: BetaSignupData) {
  try {
    await resend.emails.send({
      from: 'ReviewFlo <jeremy@usereviewflo.com>',
      to: data.email,
      subject: "You're In! Welcome to ReviewFlo Beta 🎉",
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
      from: 'ReviewFlo <jeremy@usereviewflo.com>',
      to: data.email,
      subject: "🎉 You're Invited to Join ReviewFlo Beta!",
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
      from: 'ReviewFlo <jeremy@usereviewflo.com>',
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
    const googleFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSd1jTmwDjEy5XuG80Ox3FXA3AzMq1bPEpUzZ0cXliJb4I8ozg/viewform';

    await resend.emails.send({
      from: 'Jeremy from ReviewFlo <jeremy@usereviewflo.com>',
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
                <a href="${googleFormUrl}" class="cta">
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

export async function sendAdminNotification(type: 'beta' | 'waitlist' | 'qualify', data: Record<string, unknown>) {
  try {
    const isBeta = type === 'beta';
    const isQualify = type === 'qualify';
    const subject = isBeta
      ? `New Beta Signup: ${data.businessName || 'N/A'}`
      : isQualify
      ? `New Qualification: ${data.email}`
      : 'New Waitlist Signup';

    const result = await resend.emails.send({
      from: 'ReviewFlo <jeremy@usereviewflo.com>',
      to: 'jeremy.elucidation@gmail.com',
      subject,
      html: `
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
              <h1 style="margin: 0; font-size: 24px;">${isBeta ? '🎉 New Beta Signup!' : isQualify ? '🎯 New Qualification' : '📋 New Waitlist Signup'}</h1>
            </div>
            <div class="content">
              ${isQualify ? `
                <table class="info-table">
                  <tr>
                    <td>Email:</td>
                    <td><a href="mailto:${data.email}" style="color: #2563eb;">${data.email}</a></td>
                  </tr>
                  <tr>
                    <td>Business Type:</td>
                    <td><strong>${data.businessType || 'N/A'}</strong></td>
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
                    <td>Email Status:</td>
                    <td>${data.emailSent ? '<span style="color: #10b981;">✓ Sent Successfully</span>' : '<span style="color: #ef4444;">✗ Failed to Send</span>'}</td>
                  </tr>
                </table>

                <div class="action-needed">
                  <strong>⚡ Next Step:</strong><br>
                  ${data.emailSent ? "They've been sent the Google Form link. Watch for their survey response." : "Email failed to send - you may need to manually send them the survey link."}
                </div>
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
      `
    });

    console.log('Admin notification sent:', result);
    return { success: true };
  } catch (error) {
    console.error('Error sending admin notification:', error);
    return { success: false, error };
  }
}
