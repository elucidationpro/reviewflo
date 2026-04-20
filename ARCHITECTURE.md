# ReviewFlo Codebase Architecture Overview

## Executive Summary
ReviewFlo is a Next.js application (Pages Router) built to help small business owners request, collect, and manage customer reviews. The platform is currently in **Free tier** with upcoming **Pro** and **AI tier** features planned for May 2026. The codebase is production-ready with comprehensive tier-based feature gating, Supabase backend, Resend email service, Twilio SMS support, and Google Business Profile integration.

---

## 1. Project Structure & Technology Stack

### Framework & Infrastructure
- **Next.js**: Pages Router (not App Router)
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend**: Serverless API routes (`/pages/api`)
- **Database**: Supabase (PostgreSQL with RLS)
- **Email**: Resend
- **SMS**: Twilio
- **Auth**: Supabase Auth (Email/Password + Google OAuth)
- **Analytics**: PostHog
- **Payments**: Stripe (ready for implementation)
- **Image Processing**: Sharp, Canvas, Vercel OG

### Directory Structure
```
~/reviewflow/
├── pages/                          # Next.js Pages Router
│   ├── api/                        # API endpoints
│   ├── auth/                       # OAuth routes
│   ├── admin/                      # Admin dashboard
│   ├── [slug].tsx                  # Public review collection page
│   ├── dashboard.tsx               # Business owner dashboard
│   ├── settings.tsx                # Settings/configuration
│   ├── login.tsx, join.tsx, signup.tsx
│   └── ...other pages
├── components/                     # React components
│   ├── ReviewPreview.tsx           # Live preview of review pages
│   ├── ReviewRequestsList.tsx      # Pro tier: manage sent requests
│   ├── GoogleStatsCard.tsx         # Pro/AI: Google Business stats
│   ├── SendRequestModal.tsx        # Pro/AI: send review requests UI
│   ├── AppLayout.tsx               # Main authenticated layout
│   └── ...other components
├── lib/                            # Utility & service modules
│   ├── email-service.ts            # Resend email templates
│   ├── sms-service.ts              # Twilio SMS
│   ├── tier-permissions.ts         # Feature gating functions
│   ├── supabase.ts                 # Supabase client
│   ├── google-business-profile.ts  # Google Business API
│   ├── posthog-provider.tsx        # Analytics
│   └── ...other utilities
├── supabase/migrations/            # Database migrations
├── scripts/                        # Utility scripts
├── public/                         # Static assets
└── styles/                         # Global styles
```

---

## 2. Database Schema (Supabase)

### Core Tables

#### **businesses**
- Primary business account table
- Linked to Supabase `auth.users`
- Stores branding, configuration, API keys
- **Key fields**:
  - `id` (UUID, primary key)
  - `user_id` (FK to auth.users)
  - `business_name`, `slug` (unique, public URL identifier)
  - `primary_color`, `logo_url`
  - `tier` ('free' | 'pro' | 'ai')
  - Google: `google_place_id`, `google_review_url`
  - Other platforms: `facebook_review_url`, `yelp_review_url`, `nextdoor_review_url`
  - SMS/AI: `sms_enabled`, `twilio_phone_number`
  - CRM: `square_access_token`, `jobber_api_key`, `housecall_pro_api_key`
  - White-label (AI): `white_label_enabled`, `custom_logo_url`, `custom_brand_name`, `custom_brand_color`
  - Launch preferences: `interested_in_tier`, `notify_on_launch`, `launch_discount_eligible`, `launch_discount_claimed`

#### **review_requests** (Pro/AI tier)
- Tracks review request emails/SMS sent via dashboard
- Tracks engagement (open, click, completion)
- **Key fields**:
  - `business_id`, `customer_name`, `customer_email`, `customer_phone`
  - `review_link`, `sent_via` ('email' | 'sms'), `triggered_by`
  - `status` ('pending' | 'opened' | 'clicked' | 'completed' | 'feedback')
  - `optional_note` (custom message from business owner)
  - Timestamps: `sent_at`, `opened_at`, `clicked_at`, `completed_at`, `reminder_sent_at`
  - Rating tracking: `rating` (1-5), `platform_chosen`

#### **reviews**
- Stores customer star ratings (1-5 stars)
- Submitted on public review flow (`/[slug].tsx`)
- **Key fields**:
  - `business_id`, `star_rating`, `created_at`

#### **feedback**
- Detailed feedback from dissatisfied customers (1-4 stars)
- Helps business owners address issues before they become public reviews
- **Key fields**:
  - `business_id`, `rating`, `feedback_text`, `customer_name` (optional), `customer_email` (optional), `customer_phone` (optional)
  - `is_resolved` (boolean)

#### **review_templates**
- Pre-written review suggestions for customers
- Tier-limited: Free=1 template, Pro/AI=3 templates
- **Key fields**:
  - `business_id`, `platform` ('google' | 'facebook' | 'yelp')
  - `template_text`, `slot_number`, `template_name`

#### **google_business_stats** (Pro/AI tier)
- Cached Google Business Profile stats
- Updated by cron job
- **Key fields**:
  - `business_id`, `total_reviews`, `average_rating`
  - `recent_reviews` (JSONB), `reviews_this_month`
  - `last_fetched`

#### **ai_review_drafts** (AI tier)
- AI-generated review text suggestions
- Linked to optional `review_requests`
- **Key fields**:
  - `business_id`, `review_request_id`
  - `selected_keywords` (text array)
  - `generated_text`, `used` (boolean)

#### **ai_review_responses** (AI tier)
- AI-generated responses to customer reviews
- **Key fields**:
  - `business_id`
  - `review_text`, `review_rating`, `generated_response`, `used`

### Supporting Tables
- **waitlist**: Marketing waitlist
- **beta_signups**: Beta program signups
- **early_access_signups**, **early_access_customers**: Early access tier
- **leads**: Lead management
- **invite_codes**: Admin invitation system

### Row-Level Security (RLS)
- All tables have RLS enabled
- Users can only see/modify their own business data
- Service role (API routes) bypasses RLS for server-side operations
- Public read access for `businesses` table (slug-based) and `review_templates`

---

## 3. API Routes & Endpoints

### Authentication Routes (`/api/auth/`)
- `google/start.ts` - Initiate Google OAuth flow
- `google/login-callback.ts` - Handle Google login callback
- `google/signup-callback.ts` - Handle Google signup callback
- `google/callback.ts` - Google Business Profile OAuth (Pro/AI)
- `verify-magic-link.ts` - Magic link verification
- `complete-magic-link.ts` - Complete magic link flow

### Business/Review Request Routes
- `POST /api/send-review-request` - Send review request email (Pro/AI, Auth required)
  - Body: `{ customerName, customerEmail, optionalNote }`
  - Creates `review_request` record + sends email via Resend
  
- `POST /api/sms/send-review-request` - Send review request SMS (AI only, Auth required)
  - Body: `{ customer_name, customer_phone, optional_note }`
  - Requires SMS enabled in settings

- `GET /api/my-business` - Get authenticated user's business + templates (Auth required)
  - Returns business data + templates for dashboard

- `POST /api/update-business-settings` - Update business configuration (Auth required)
  - Body: branding, URLs, templates choice
  
- `POST /api/upload-logo` - Upload business logo (Auth required)
  - Returns signed URL for logo storage

### Review Requests Management (Pro/AI)
- `GET /api/review-requests/list` - List sent review requests (Auth required)
- `GET /api/review-requests/stats` - Get review request engagement stats (Auth required)

### Tracking Routes (Conversion Attribution)
- `GET /api/track/open` - Track email opens (token-based)
- `GET /api/track/click` - Track link clicks (token-based)
- `GET /api/track/complete` - Track review completion (token-based)

### Admin Routes (`/api/admin/`)
- Requires admin authentication
- `POST /api/admin/create-business` - Create business for user
- `GET /api/admin/get-beta-signups` - List beta signups
- `POST /api/admin/mark-beta-converted` - Convert beta to paid
- Various analytics & management routes

### Cron Jobs (`/api/cron/`)
- `fetch-google-stats.ts` - Fetch Google Business stats (Pro/AI)
- `send-reminders.ts` - Send review request reminders
- `send-weekly-reports.ts` - Send weekly digest emails

### Other Endpoints
- `POST /api/join` - Handle join/signup form
- `POST /api/create-beta-account` - Create beta account with magic link
- `POST /api/check-slug` - Verify slug availability
- `POST /api/waitlist-signup` - Add to waitlist
- `POST /api/early-access-status` - Check early access status

---

## 4. Tier-Based Feature Gating

### Access Control (`lib/tier-permissions.ts`)

```typescript
// Free tier - baseline
✓ Public review collection (1-5 stars)
✓ Feedback capture for low ratings (1-4 stars)
✓ 1 review template slot
✓ Basic branding
✓ Email authentication

// Pro tier ($19/month - May 2026)
+ Send review requests from dashboard (email)
+ Multi-platform support (Google, Facebook, Yelp, Nextdoor)
+ 3 review template slots
+ Remove "Powered by ReviewFlo" branding
+ Google Business Profile stats (requires OAuth)
+ Auto follow-ups/reminders

// AI tier ($49/month - May 2026)
+ All Pro features
+ SMS automation (Twilio)
+ CRM integrations (Square, Jobber, Housecall Pro)
+ AI review drafts (customer-facing suggestions)
+ AI review responses (generate replies to reviews)
+ White-label mode (complete branding override)
```

### Permission Checks in Code
- `canSendFromDashboard(tier)` - Pro/AI
- `canAccessMultiPlatform(tier)` - Pro/AI
- `canRemoveBranding(tier)` - Pro/AI
- `canAccessGoogleStats(tier)` - Pro/AI
- `canUseSMS(tier)` - AI only
- `canUseCRMIntegration(tier)` - AI only
- `canUseAIFeatures(tier)` - AI only
- `canUseWhiteLabel(tier)` - AI only
- `getTemplateSlots(tier)` - Returns 1 (free) or 3 (pro/ai)

---

## 5. Email & Messaging Infrastructure

### Email Service (Resend via `lib/email-service.ts`)

**User Signup/Onboarding Emails**
- `sendBetaConfirmationEmail()` - Welcome email for beta testers
- `sendBetaInvitationEmail()` - Invite email from waitlist
- `sendWaitlistConfirmationEmail()` - Waitlist confirmation
- `sendQualificationEmail()` - Beta survey/qualification
- `sendEarlyAccessBetaWelcomeEmail()` - Early access welcome

**Business Owner Notifications**
- `sendAdminNotification()` - Notify admins of new signups/beta signups
  - Types: 'beta', 'waitlist', 'qualify', 'early_access', 'early_access_beta', 'signup'
  - Includes detailed HTML tables with action items

**Review Request Emails (Pro/AI)**
- `sendReviewRequestEmail(data)` - Initial review request
  - Uses tracking token for click attribution
  - Personalizes with customer name, business name
  - Includes optional note from business owner
  - CTA routes through `/api/track/click` for engagement tracking

- `sendReviewReminderEmail(data)` - Follow-up reminder
  - Sent days after initial request if not completed

### SMS Service (Twilio via `lib/sms-service.ts`)

```typescript
// AI tier only
sendReviewRequestSMS(
  toNumber: string,
  customerName: string,
  businessName: string,
  reviewLink: string,
  fromNumber?: string
): Promise<{ success: boolean; error?: string }>

sendReviewReminderSMS(
  toNumber: string,
  customerName: string,
  businessName: string,
  reviewLink: string,
  fromNumber?: string
): Promise<{ success: boolean; error?: string }>
```

**Phone Number Validation**: Regex `/^\+?1?\d{10,15}$/` for international format

---

## 6. Authentication Setup

### Supabase Auth Configuration

**Authentication Methods**:
1. **Email/Password**
   - Standard signup/login
   - Password reset via email
   - Verified email required

2. **Google OAuth**
   - Handles both login and signup
   - Configured via Google Cloud Console
   - Client ID: `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID`
   - OAuth flows in `/pages/api/auth/google/`
   - CSRF protection via state token in `lib/google-oauth-csrf.ts`

3. **Magic Links**
   - Email-based passwordless auth (beta)
   - Used in early access flows
   - Routes: `/api/auth/verify-magic-link` and `/api/auth/complete-magic-link`

### Session Management
- Uses Supabase session tokens
- Bearer token auth in API routes: `Authorization: Bearer {token}`
- Token validation via `supabaseAdmin.auth.getUser(token)`

### Admin Authentication
- Special admin flag in Supabase
- Admin users redirected to `/admin` dashboard
- Checked via `checkIsAdmin()` in `lib/adminAuth.ts`

---

## 7. Current AI/LLM Integration

### Status: **PREPARED BUT NOT YET IMPLEMENTED**

The codebase has the infrastructure ready for AI features (May 2026):

#### **Database Tables Ready**
- `ai_review_drafts` - Store AI-generated review suggestions
- `ai_review_responses` - Store AI-generated responses to reviews

#### **Anthropic SDK Installed**
- `@anthropic-ai/sdk` (v0.79.0) already in dependencies
- Ready to use Claude API

#### **Tier Permission Framework**
- `canUseAIFeatures(tier)` checks for 'ai' tier
- Settings page has placeholders for AI features UI
  - AI Review Drafts toggle
  - AI Review Responses toggle
  - Response tone selector
  - Business type input

#### **Where to Implement**
1. **Review Drafts** (Customer-facing):
   - When customer gives 5-star rating, before template page
   - Show keyword selector, AI generates review text based on keywords
   - Customer can edit/copy suggested text
   - Store in `ai_review_drafts` table if used

2. **Review Responses** (Business owner feature):
   - When business views a review in dashboard
   - Generate professional response based on:
     - Review text & rating
     - Business type (from settings)
     - Response tone preference
   - Store in `ai_review_responses` if posted
   - Show review platform for manual posting

#### **Implementation Considerations**
- No env var for Claude API key yet (will need `ANTHROPIC_API_KEY`)
- Need to add API route: `/api/ai/generate-review-draft` and `/api/ai/generate-response`
- Consider streaming responses for better UX
- Rate limiting needed for API tier/usage tracking
- Cache/memoization for common patterns

---

## 8. Key Components for Review Flow

### Public Review Collection (`[slug].tsx`)
**Route**: `https://usereviewflo.com/{business-slug}`
- Star rating interface (1-5 stars)
- Routes based on rating:
  - 1-4 stars: → Feedback form (`/[slug]/feedback`)
  - 5 stars: → Review templates (`/[slug]/templates`)
- Tracking token for email attribution

### Template Selection & Custom Reviews (`/[slug]/templates`)
- Display 1 (free) or 3 (pro/ai) review templates
- Or skip templates if disabled in settings
- Customer can copy template or write own review
- Links to Google, Facebook, Yelp, Nextdoor as configured
- White-label branding supported (AI tier)

### Feedback Form (`/[slug]/feedback`)
- Collects detailed feedback from 1-4 star reviews
- Optional: customer name, email, phone
- Helps business address issues before public reviews
- Resolved/unresolved tracking in dashboard

### Dashboard (`/dashboard.tsx`)
- Review stats this month (rating breakdown)
- Quick stats (avg rating, pending feedback)
- Google Business stats (Pro/AI)
- Review requests sent (Pro/AI)
- Your review link + copy button
- Upgrade prompts for free tier

### Settings (`/settings.tsx`)
**Sections**:
1. **Branding**: Business name, logo, color
2. **Review Links**: Google, Facebook, Yelp, Nextdoor
3. **Review Flow**: Template settings, template text editing
4. **SMS Automation** (AI): Twilio config (disabled until launch)
5. **CRM Integration** (AI): Square, Jobber, Housecall Pro (disabled until launch)
6. **AI Features** (AI): Review drafts, response generation (disabled until launch)
7. **Plan**: Current tier, launch notifications

### Components
- **ReviewPreview.tsx**: Live preview of review flow as customer sees it
- **ReviewRequestsList.tsx**: Pro/AI - show sent requests, engagement stats
- **SendRequestModal.tsx**: Pro/AI - modal to send new review requests
- **GoogleStatsCard.tsx**: Pro/AI - display Google Business stats
- **OnboardingProgress.tsx**: Show setup completion progress

---

## 9. Key Utilities & Libraries

### `lib/email-service.ts`
- 37KB file with all email templates
- Uses Resend API
- HTML email generation with inline CSS
- Admin notification system with formatted data tables

### `lib/google-business-profile.ts`
- Google Business Profile API integration
- Fetches business info, reviews, photos
- Uses OAuth tokens stored in businesses table
- Handles rate limiting and error cases

### `lib/google-places-service.ts`
- Google Places API (not Business Profile)
- Fetch basic business info
- Supplement data if Business Profile not connected

### `lib/sms-service.ts`
- Twilio SMS client initialization
- Phone number validation
- Error handling for SMS failures

### `lib/tier-permissions.ts`
- Centralized feature gating
- All tier checks go through this module
- Prevents inconsistent feature checks

### `lib/posthog-provider.tsx`
- PostHog analytics integration
- Event tracking: `trackEvent(eventName, properties)`
- User identification: `identifyUser(userId, properties)`
- Conversion tracking for upgrade metrics

### `lib/slug-utils.ts`
- Slug generation and validation
- Ensures unique, URL-safe slugs

### `lib/review-page-branding.ts`
- Resolves accent colors for public review pages
- Handles white-label branding fallbacks

---

## 10. Notable Features & Patterns

### Tracking & Attribution
- Unique `tracking_token` UUID on each review request
- Email CTA routes through `/api/track/click?t={token}`
- Tracks open, click, completion in `review_requests` table
- Response time measurements

### Responsive Design
- Tailwind CSS with careful breakpoint handling
- Mobile-first approach
- Accessible components (ARIA labels)

### Error Handling
- Try-catch in API routes with proper HTTP status codes
- User-friendly error messages
- Admin logging for debugging

### Session Management
- Checks for valid session on protected pages
- Redirects to login if unauthorized
- Bearer token validation in API routes

### Launch Discount System
- Tracks `launch_discount_eligible` flag
- `launch_discount_claimed` once used
- 50% off first 3 months for early signups

---

## 11. Testing & Deployment

### Environment Variables
**Production URLs**:
- App: `https://www.usereviewflo.com`
- Supabase: `https://qawrdhxyadfmuxdzeslo.supabase.co`

**Development**: Uses `NEXT_PUBLIC_APP_URL` (defaults to `http://localhost:3000`)

### Build & Run
```bash
npm run dev      # Local development
npm run build    # Production build
npm start        # Run production server
npm run lint     # ESLint
```

### Deployment
- Vercel (inferred from production domain + next.config.ts)
- Environment variables managed in Vercel dashboard
- Database migrations applied manually to Supabase

---

## 12. Security & Best Practices

### RLS & Data Privacy
- Row-level security on all tables
- Service role used only for server-side operations
- Anon role limited to public reads
- No sensitive data exposed to client

### Secret Management
- API keys in environment variables (not committed)
- Twilio, Stripe, Google OAuth credentials secured
- Supabase service role key restricted to backend

### Input Validation
- Email format validation
- Phone number format validation
- Slug uniqueness checks
- Template text length limits (200 chars for notes)

### CSRF Protection
- Google OAuth state token
- Session-based CSRF tokens for forms

---

## Summary for Building AI Features

The ReviewFlo codebase is **well-architected and ready for AI integration**:

1. **Database tables exist** for storing AI-generated content (`ai_review_drafts`, `ai_review_responses`)
2. **Tier framework is in place** to gate AI features to AI tier only
3. **Anthropic SDK is installed** and ready to use
4. **UI placeholders exist** in settings for AI features
5. **API route patterns are established** for similar operations (sending emails, SMS, etc.)
6. **User management & authentication** is solid and extensible

**Next steps for AI implementation**:
- Create `/api/ai/generate-review-draft` endpoint (uses selected keywords)
- Create `/api/ai/generate-response` endpoint (uses review text + context)
- Add UI components for keyword selection (review drafts)
- Add response review/edit interface (review responses)
- Implement streaming for better UX
- Add rate limiting / usage tracking for API tier
