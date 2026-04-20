# Pre-push checklist

Run through this before pushing or merging to `main` (especially for customer-facing and AI-tier work).

1. **`npm run build`** — TypeScript and production build succeed locally.
2. **Review flow template toggle** — In Settings → Review Flow, flip “Show review templates,” save, reload, and confirm the value sticks (requires `skip_template_choice` column in Supabase). Spot-check `/[slug]/templates` behavior for a test business.
3. **White-label (AI tier)** — With an AI-tier test business: enable white-label, set custom brand name (and optional footer color), save. Confirm live pages (`/[slug]`, `/[slug]/templates`, `/[slug]/feedback`) show “Powered by …” correctly, not a blank footer. Optional: `/demo` white-label toggle for a quick UI check.
4. **Env / migrations** — If the change touches new columns or APIs, confirm the relevant Supabase migrations are applied in the environment you care about (staging/prod) and Vercel env vars are set.
5. **Custom domains (when implemented)** — After a business connects `reviews.theirbrand.com` (or similar), verify DNS + SSL in Vercel, open the review flow on that host, and confirm links in test email/SMS use the custom base URL. Spec: [`docs/CUSTOM_DOMAINS.md`](./CUSTOM_DOMAINS.md).

## Other docs

- **AI / SMS / CRM backlog and what’s already built:** [`docs/AI_FEATURES_STATUS.md`](./AI_FEATURES_STATUS.md)
- **Custom domains product + technical outline:** [`docs/CUSTOM_DOMAINS.md`](./CUSTOM_DOMAINS.md)

Add items here as new surfaces ship.
