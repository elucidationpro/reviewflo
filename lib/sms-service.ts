import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export async function sendReviewRequestSMS(
  toNumber: string,
  customerName: string,
  businessName: string,
  reviewLink: string,
  fromNumber?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const twilioFrom = fromNumber || process.env.TWILIO_PHONE_NUMBER
    if (!twilioFrom) {
      return { success: false, error: 'Twilio phone number not configured' }
    }
    await client.messages.create({
      body: `Hi ${customerName}! Thanks for choosing ${businessName}. How was your experience? Rate us here: ${reviewLink} - ${businessName}`,
      from: twilioFrom,
      to: toNumber,
    })
    return { success: true }
  } catch (error) {
    const err = error as { message?: string }
    console.error('SMS send error:', error)
    return { success: false, error: err?.message ?? 'Failed to send SMS' }
  }
}

export async function sendReviewReminderSMS(
  toNumber: string,
  customerName: string,
  businessName: string,
  reviewLink: string,
  fromNumber?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const twilioFrom = fromNumber || process.env.TWILIO_PHONE_NUMBER
    if (!twilioFrom) {
      return { success: false, error: 'Twilio phone number not configured' }
    }
    await client.messages.create({
      body: `Quick reminder from ${businessName} - we'd love your feedback: ${reviewLink}`,
      from: twilioFrom,
      to: toNumber,
    })
    return { success: true }
  } catch (error) {
    const err = error as { message?: string }
    console.error('SMS reminder error:', error)
    return { success: false, error: err?.message ?? 'Failed to send SMS reminder' }
  }
}
