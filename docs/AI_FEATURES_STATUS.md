# AI tier & related features — current state (snapshot)

Use this as the working backlog. Update it when you ship or reprioritize.

## Done or largely in place

| Area | Notes |
|------|--------|
| **DB (AI migration)** | `supabase/migrations/20250316100000_ai_tier_schema.sql` — SMS/CRM/white-label columns, `ai_review_drafts`, `ai_review_responses`, `review_requests` phone / `sent_via`, etc. Must be applied in Supabase for prod. |
| **Tier helpers** | `lib/tier-permissions.ts` — `canUseSMS`, `canUseCRMIntegration`, `canUseAIFeatures`, `canUseWhiteLabel`, etc. |
| **Claude integration** | `lib/claude.ts` — Anthropic client; helpers used by APIs below. Needs `ANTHROPIC_API_KEY` in env. |
| **AI template / request copy** | `POST /api/ai/generate-template.ts` — AI-tier gated; can save to `ai_review_drafts`. UI: `components/AITemplateGenerator.tsx`, opened from **Settings → AI Features**. |
| **AI review responses** | `POST /api/ai/generate-response.ts` — gated; saves to `ai_review_responses`. UI: `components/AIReviewResponseGenerator.tsx`, opened from **Settings → AI Features**. |
| **White-label on review pages** | Customer routes + `lib/review-page-branding.ts` + `ReviewFloFooter` — see pre-push checklist for verification. |
| **SMS send API** | `pages/api/sms/send-review-request.ts`, `lib/sms-service.ts`, `pages/api/sms/test.ts` — Twilio env: `TWILIO_*`. |
| **Settings save** | `pages/api/update-business-settings.ts` — SMS, white-label, `skip_template_choice`, etc. (with column-missing retry behavior). |

## Stub / “coming soon” in UI (backend may exist)

| Area | Notes |
|------|--------|
| **Settings → SMS** | Toggles/fields disabled; “May 2026” copy. Real wiring should use `sms_enabled`, `twilio_phone_number`, `update-business-settings`, and `/api/sms/*`. |
| **Settings → CRM** | Placeholder cards (Square / Jobber / Housecall Pro); no live connect flows. |
| **Settings → AI Features (toggles)** | Old “coming soon” cards for drafts/responses may still exist beside the new generator buttons — consolidate when stable. |

## Not done (typical next order)

1. **SMS end-to-end** — Wire **Settings → SMS** to real `businessData` + save; enable **cron** SMS reminders in `pages/api/cron/send-reminders.ts` (currently **email-only**; query must include `customer_phone`, `sent_via`, and business `tier` / `sms_enabled` / `twilio_phone_number`). Test with Twilio + migration.
2. **CRM** — Square webhook + OAuth (then other CRMs as prioritized).
3. **Customer-facing AI review draft** — Keyword flow on **`/[slug]/templates`** (or dedicated API `generate-review` if split from owner “template generator”); tie to `ai_review_drafts` + token/`review_request_id` where relevant.
4. **Dashboard AI on real reviews** — Surface **AIReviewResponseGenerator** from **`GoogleStatsCard`** (or review list) for AI tier, not only Settings modal.
5. **Custom domains** — Spec in `docs/CUSTOM_DOMAINS.md` (not started in code).
6. **PostHog / polish** — Ensure key AI + SMS events are instrumented consistently.

## Env quick reference

| Variable | Used for |
|----------|-----------|
| `ANTHROPIC_API_KEY` | Claude (`lib/claude.ts`) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | SMS |
| `CRON_SECRET` | Cron routes including reminders |

## Related docs

- `docs/PRE_PUSH_CHECKLIST.md` — before push / merge.
- `docs/CUSTOM_DOMAINS.md` — first-party review URLs (future).
