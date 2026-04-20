# ReviewFlo Quick Reference Guide

## Key File Locations

### Critical Files for AI Feature Development
```
lib/tier-permissions.ts           # Feature gating - where to check `canUseAIFeatures()`
supabase/migrations/
  20250316100000_ai_tier_schema.sql   # AI tables: ai_review_drafts, ai_review_responses
lib/email-service.ts              # Email template patterns to follow
pages/api/send-review-request.ts  # Request handling pattern to replicate
pages/settings.tsx (lines 1284-1354)  # AI Features UI section (currently disabled)
```

### Database Tables (AI-Specific)
```sql
-- Review draft suggestions from AI
ai_review_drafts (
  id UUID PRIMARY KEY,
  business_id UUID (FK),
  review_request_id UUID (FK nullable),
  selected_keywords TEXT[],
  generated_text TEXT,
  used BOOLEAN,
  created_at TIMESTAMP
)

-- AI-generated responses to reviews
ai_review_responses (
  id UUID PRIMARY KEY,
  business_id UUID (FK),
  review_text TEXT,
  review_rating INTEGER,
  generated_response TEXT,
  used BOOLEAN,
  created_at TIMESTAMP
)
```

## API Endpoint Patterns to Follow

### Email/SMS Send Pattern (from `send-review-request.ts`)
```typescript
// 1. Auth check
const token = authHeader.replace('Bearer ', '')
const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

// 2. Input validation
if (!required_field?.trim()) return res.status(400).json({ error: '...' })

// 3. Business lookup & tier check
const { data: business } = await supabaseAdmin
  .from('businesses')
  .select('id, tier')
  .eq('user_id', user.id)
  .single()

if (!canUseAIFeatures(business.tier as 'free' | 'pro' | 'ai')) {
  return res.status(403).json({ error: 'AI tier required' })
}

// 4. Service logic (call Claude API here)
const response = await anthropic.messages.create({ ... })

// 5. Store in database
const { data: record } = await supabaseAdmin
  .from('ai_review_drafts')
  .insert({ ... })
  .select()

// 6. Return success
return res.status(200).json({ success: true, data: record })
```

## Environment Variables Needed

```bash
# Add to .env.local (or Vercel dashboard for production)
ANTHROPIC_API_KEY=sk-ant-...  # Your Claude API key
```

## Component Update Locations

### Settings Page AI Section
**File**: `pages/settings.tsx` (lines 1284-1354)

Current placeholders to enable:
```tsx
{/* ══ AI FEATURES (AI Tier) ══ */}
{activeSection === 'ai-features' && (
  <>
    <Card title="AI-Powered Features">
      <Toggle id="aiReviewDrafts" ... />     // Enable this
      <Toggle id="aiReviewResponses" ... />  // Enable this
      <Field label="Response Tone" ... />    // Enable this
      <Field label="Business Type" ... />    // Enable this
    </Card>
  </>
)}
```

### Dashboard Location
**File**: `pages/dashboard.tsx` - Add AI suggestions section after Google stats

## Making API Calls from Frontend

### From React Components
```typescript
// Get session token
const { data: { session } } = await supabase.auth.getSession()

// Call AI endpoint with Bearer token
const res = await fetch('/api/ai/generate-review-draft', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`
  },
  body: JSON.stringify({
    businessId,
    selectedKeywords: ['friendly', 'professional'],
    reviewRating: 5
  })
})

const data = await res.json()
if (!res.ok) {
  setError(data.error || 'Failed to generate')
  return
}

setGeneratedText(data.generated_text)
```

## Testing Tier Features Locally

### Free Tier
```sql
UPDATE businesses SET tier = 'free' WHERE id = 'your-business-id';
```

### Pro Tier
```sql
UPDATE businesses SET tier = 'pro' WHERE id = 'your-business-id';
```

### AI Tier (for testing)
```sql
UPDATE businesses SET tier = 'ai' WHERE id = 'your-business-id';
```

## Anthropic Claude API Integration

### Installation
```bash
npm install @anthropic-ai/sdk
```

### Basic Usage Pattern
```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const message = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',  // Latest model
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: 'Generate a positive Google review for a plumbing business'
    }
  ]
})

const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
```

### Streaming (for better UX)
```typescript
const stream = await anthropic.messages.stream({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{ role: 'user', content: prompt }]
})

for await (const event of stream) {
  if (event.type === 'content_block_delta') {
    const delta = event.delta
    if (delta.type === 'text_delta') {
      process.stdout.write(delta.text)
    }
  }
}
```

## Database RLS Pattern

All AI tables have this RLS policy:
```sql
-- User can only access their own business
DROP POLICY IF EXISTS "Owners can manage own ai_review_drafts" ON ai_review_drafts;
CREATE POLICY "Owners can manage own ai_review_drafts" ON ai_review_drafts
  FOR ALL
  USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  )
  WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

-- Service role (API) can do everything
DROP POLICY IF EXISTS "Service role full access ai_review_drafts" ON ai_review_drafts;
CREATE POLICY "Service role full access ai_review_drafts" ON ai_review_drafts
  FOR ALL
  USING (auth.role() = 'service_role');
```

## API Route Creation Checklist

When adding a new AI endpoint (e.g., `/api/ai/generate-review-draft.ts`):

- [ ] Import types: `NextApiRequest`, `NextApiResponse`
- [ ] Check method: `if (req.method !== 'POST') return res.status(405).json(...)`
- [ ] Validate auth: Extract and verify Bearer token
- [ ] Check tier: Use `canUseAIFeatures()` or specific permission
- [ ] Validate input: Email format, length, etc.
- [ ] Call Claude API
- [ ] Store result in Supabase table (if needed)
- [ ] Return JSON response with proper status codes
- [ ] Wrap in try-catch for error handling
- [ ] Add console.log for debugging

## Common Status Codes
- 200: Success
- 400: Bad request (validation failed)
- 401: Unauthorized (invalid/missing token)
- 403: Forbidden (feature not available in tier)
- 404: Not found
- 405: Method not allowed
- 500: Server error

## Testing AI Features

### Local Development
1. Start dev server: `npm run dev`
2. Set tier to 'ai' in database
3. Navigate to `/settings` and open "AI Features" section
4. Test API calls with PostHog events tracked
5. Check Supabase tables for records created

### PostHog Event Tracking
```typescript
// From lib/posthog-provider.ts
trackEvent('ai_review_draft_generated', {
  businessId: business.id,
  keywordsCount: keywords.length,
  timestamp: new Date().toISOString()
})
```

## Common Gotchas

1. **RLS Errors**: Make sure you're using `supabaseAdmin` (service role) in API routes, not client
2. **Bearer Token**: Always include `Authorization: Bearer {token}` from frontend
3. **Tier Check**: Double-check `canUseAIFeatures()` returns true for 'ai' tier only
4. **Rate Limiting**: Consider adding rate limiting for Claude API calls
5. **Error Messages**: Return user-friendly errors, log detailed errors to console

## File Size Reference

- `lib/email-service.ts`: 37KB (comprehensive template system)
- `pages/settings.tsx`: 70KB (complex multi-section settings)
- `pages/dashboard.tsx`: 25KB (main dashboard)
- These large files show patterns you can replicate

## Key Function Signatures

```typescript
// Feature gating
canUseAIFeatures(tier: 'free' | 'pro' | 'ai' | undefined): boolean

// Email patterns to follow
sendReviewRequestEmail(data: ReviewRequestEmailData): Promise<{ success: boolean; error?: string; id?: string }>

// SMS patterns
sendReviewRequestSMS(toNumber: string, customerName: string, businessName: string, reviewLink: string, fromNumber?: string): Promise<{ success: boolean; error?: string }>

// Tracking (already in place)
trackEvent(eventName: string, properties: Record<string, unknown>): void
```

## Review Flow Routes

User journey for review collection:
1. Business owner sends link: `https://usereviewflo.com/{slug}`
2. Customer rates (1-5 stars) on `/{slug}`
3. 1-4 stars → `/{slug}/feedback`
4. 5 stars → `/{slug}/templates`
5. Customer copies template or writes own review
6. Customer clicks to review platform (Google, Facebook, Yelp, etc.)

AI integration points:
- **AI Drafts**: Before `/templates` page, show keyword selector + AI-generated text
- **AI Responses**: In dashboard review details, generate response suggestion

---

## Quick Start: Adding AI Review Drafts

1. Create `/pages/api/ai/generate-review-draft.ts`
   - Validate keywords from request
   - Call Claude API
   - Store in `ai_review_drafts` table
   - Return generated text

2. Add UI component for keyword selection
   - Show 5-10 common keywords
   - Allow custom keywords
   - Call `/api/ai/generate-review-draft`
   - Display generated text for copying

3. Update settings form
   - Enable "AI Review Drafts" toggle in AI Features section
   - Show setting in business record

4. Test
   - Set tier to 'ai'
   - Verify feature appears in settings
   - Send 5-star review request
   - Check AI draft generation works

---

## Production Checklist

Before deploying AI features:

- [ ] Add `ANTHROPIC_API_KEY` to Vercel environment variables
- [ ] Test all API routes with valid/invalid inputs
- [ ] Verify RLS policies prevent cross-business access
- [ ] Add rate limiting to Claude API calls
- [ ] Test streaming responses work on mobile
- [ ] Verify error messages are user-friendly
- [ ] Check database migrations are applied
- [ ] Test tier gating with multiple user accounts
- [ ] Monitor Claude API usage/costs
- [ ] Add logging/monitoring for AI API calls

---
