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

              <p>Thanks for joining the ReviewFlo waitlist! You're one of <strong>148 businesses</strong> waiting for launch.</p>

              <p>I'll email you when we go live in <strong>about 6 weeks</strong>.</p>

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

export async function sendAdminNotification(type: 'beta' | 'waitlist', data: any) {
  try {
    await resend.emails.send({
      from: 'ReviewFlo <notifications@usereviewflo.com>',
      to: 'elucidation.production@gmail.com',
      subject: `New ${type === 'beta' ? 'Beta' : 'Waitlist'} Signup`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: monospace;">
          <h2>New ${type === 'beta' ? 'Beta Tester' : 'Waitlist'} Signup</h2>
          <pre>${JSON.stringify(data, null, 2)}</pre>
          ${type === 'beta' ? `<p><strong>Action needed:</strong> Text ${data.phone} within 24 hours to set them up.</p>` : ''}
        </body>
        </html>
      `
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending admin notification:', error);
    return { success: false, error };
  }
}
