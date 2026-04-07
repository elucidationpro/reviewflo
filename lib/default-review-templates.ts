/** Same default copy as signup/join — used for marketing demo preview. */
export type DefaultTemplatePlatform = 'google' | 'facebook' | 'yelp'

export interface DefaultReviewTemplate {
  id: string
  template_text: string
  platform: DefaultTemplatePlatform
}

export function getDefaultReviewTemplates(businessName: string): DefaultReviewTemplate[] {
  const name = businessName.trim() || 'Your Business'
  return [
    {
      id: 'demo-google',
      platform: 'google',
      template_text: `I had an excellent experience with ${name}! They exceeded my expectations. Highly recommend!`,
    },
    {
      id: 'demo-facebook',
      platform: 'facebook',
      template_text: `Just had a great experience with ${name}! Professional service and fantastic results. 5 stars! ⭐⭐⭐⭐⭐`,
    },
    {
      id: 'demo-yelp',
      platform: 'yelp',
      template_text: `5 stars for ${name}! Quality work, professional service, and fair pricing. Will definitely use again.`,
    },
  ]
}
