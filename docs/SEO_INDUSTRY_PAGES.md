# ReviewFlo — Industry SEO Pages

## What We're Building

Programmatic SEO landing pages targeting "[industry] review management" searches.
One page per industry. Each lives at `/for/[industry-slug]`.

The goal is to rank organically for long-tail searches like:
- "medical spa review management"
- "barber shop review management software"
- "HVAC review management"

Inspired by how Canva dominates with `/create/[template]` pages — high volume,
consistent structure, unique content per page. We're doing the same for service
business industries.

---

## ReviewFlo Values (Non-Negotiable in All Copy)

**Honesty first.** We do not fabricate data, stats, testimonials, or social proof.
If we don't have a real number, we don't use a number. No "46% response rate",
no "200+ businesses using ReviewFlo", no fake quotes. Ever.

**Transparency.** We tell people exactly what the product does and doesn't do.
We don't oversell features that aren't live yet. If something is coming soon, say so.

**Built for small businesses.** We are not an enterprise tool. We're built for the
1–10 person service business. Copy should feel like it's from someone who
understands their actual day — not a SaaS marketing team.

---

## Copy Rules (Apply to Every Industry Page)

- Short sentences. Active voice.
- Pain points describe the pain only — do not slip into the solution inside a pain point.
- No fabricated stats. Real numbers only (e.g. Podium's $289/mo pricing is real and fair to cite).
- No buzzwords: seamlessly, game-changing, revolutionary, leverage, cutting-edge,
  streamline, robust, world-class, unlock potential, innovative.
- Body text per section: 1–2 sentences max. If you need more, the copy is too complex.
- Testimonials/social proof: leave the section out entirely until we have real customers.
- CTAs: always include "No Credit Card" — never bury it.

**Good example:**
> "A Botox client isn't posting about their treatment publicly — even if they loved it.
> Privacy is the default."

**Bad example:**
> "Clients may love the results but still avoid public reviews. Review requests should
> focus on the experience, not the treatment."
> (Second sentence is the solution, not the pain. Cut it.)

---

## Page Structure

Every industry page follows this exact section order:

1. **Hero** — H1 + one-line subheading + CTAs + 3 pricing stat cards ($0 / $19 / $289 Podium)
2. **Pain Points** — 3 cards. Heading = the pain. Body = 1 sentence max, just the pain.
3. **How It Works** — 3 steps (same for every industry, generic is fine here)
4. **Benefits** — 4 items (2-col grid). Industry-specific where possible.
5. **Pricing** — Reuse `MarketingPricingSection` component. Do not duplicate.
6. **FAQ** — 4–5 questions, industry-specific. Accordion. No fabricated stats in answers.
7. **Related Industries** — 3 links to nearby `/for/` pages.
8. **Final CTA** — Heading + subheading + two buttons (Start Free + See Full Pricing).

**Do not add sections.** Do not remove sections. Keep this order.

---

## SEO Requirements (Every Page)

- `<title>`: "[Industry] Review Management Software | ReviewFlo" — under 60 chars
- `<meta description>`: under 160 chars, no fabricated claims
- H1: "Review Management for [Industry]" or "[Industry] Review Management Software"
- Eyebrow keyword label above H1: visually hidden (`sr-only`) — SEO only, not visible
- Canonical: `https://reviewflo.com/for/[slug]`
- JSON-LD: FAQPage schema + SoftwareApplication schema on every page
- OG/Twitter tags
- Static generation (SSG) with ISR revalidate: 86400

---

## Data Structure

Each industry page is driven by `/data/industries/[slug].json`.
The template (`components/IndustryLandingPage.tsx`) renders from that data.
To add a new industry page: add a JSON file. No new code needed.

Required fields in each JSON:
```json
{
  "slug": "string",
  "name": "string — display name",
  "plural": "string — e.g. 'medspas', 'barber shops'",
  "seo": {
    "title": "string — under 60 chars",
    "metaDescription": "string — under 160 chars",
    "h1": "string"
  },
  "hero": {
    "subheading": "string — 1–2 sentences, industry-specific, no fabricated stats"
  },
  "painPoints": [
    { "heading": "string", "body": "string — 1 sentence, pain only" },
    { "heading": "string", "body": "string — 1 sentence, pain only" },
    { "heading": "string", "body": "string — 1 sentence, pain only" }
  ],
  "benefits": [
    { "heading": "string", "body": "string — 1 sentence" },
    { "heading": "string", "body": "string — 1 sentence" },
    { "heading": "string", "body": "string — 1 sentence" },
    { "heading": "string", "body": "string — 1 sentence" }
  ],
  "faq": [
    { "q": "string", "a": "string — direct, no fabricated stats" }
  ],
  "relatedIndustries": [
    { "name": "string", "slug": "string" }
  ]
}
```

---

## Industry List (Priority Order)

Build these pages in this order. Start with the medspa page (already built) as the
reference implementation for format and tone.

### Tier 1 — Build First
| Slug | Name |
|---|---|
| medical-spas | Medical Spas ✅ |
| barber-shops | Barber Shops |
| hair-salons | Hair Salons |
| auto-repair-shops | Auto Repair Shops |
| dental-practices | Dental Practices |
| hvac-repair | HVAC Repair |
| plumbing-services | Plumbing Services |
| hotels | Hotels |
| motels | Motels |
| mobile-auto-detailing | Mobile Auto Detailing |

### Tier 2 — Build Next
| Slug | Name |
|---|---|
| nail-salons | Nail Salons |
| dog-grooming | Dog Grooming |
| mobile-dog-grooming | Mobile Dog Grooming |
| veterinary-clinics | Veterinary Clinics |
| wedding-venues | Wedding Venues |
| mobile-mechanics | Mobile Mechanics |
| physical-therapy | Physical Therapy |
| chiropractors | Chiropractors |
| massage-therapy | Massage Therapy |
| personal-training | Personal Training |

### Tier 3 — Fill Out
| Slug | Name |
|---|---|
| day-spas | Day Spas |
| eyebrow-lash-studios | Eyebrow and Lash Studios |
| yoga-studios | Yoga Studios |
| pilates-studios | Pilates Studios |
| lawn-care | Lawn Care and Landscaping |
| pressure-washing | Pressure Washing |
| carpet-cleaning | Carpet Cleaning |
| pest-control | Pest Control |
| handyman-services | Handyman Services |
| electricians | Electricians |
| window-cleaning | Window Cleaning |
| pool-cleaning | Pool Cleaning and Maintenance |
| garage-door-repair | Garage Door Repair |
| appliance-repair | Appliance Repair |
| locksmith-services | Locksmith Services |
| gutter-cleaning | Gutter Cleaning |
| orthodontists | Orthodontists |
| cosmetic-dentistry | Cosmetic Dentistry |
| dermatology-clinics | Dermatology Clinics |
| acupuncture | Acupuncture |
| nutrition-coaching | Nutrition Coaching |
| permanent-makeup | Permanent Makeup |
| estheticians | Estheticians |
| tanning-salons | Tanning Salons |
| makeup-artists | Makeup Artists |
| bed-and-breakfasts | Bed and Breakfasts |
| vacation-rentals | Vacation Rentals |
| rv-parks-campgrounds | RV Parks and Campgrounds |
| event-venues | Event Venues |
| oil-change-services | Oil Change Services |
| tire-shops | Tire Shops |
| collision-repair | Collision Repair |
| transmission-repair | Transmission Repair |
| windshield-repair | Windshield Repair |
| pet-boarding | Pet Boarding |
| pet-sitting | Pet Sitting |
| dog-walking | Dog Walking |
| mobile-vet-services | Mobile Vet Services |
| tax-preparation | Tax Preparation |
| accounting-firms | Accounting Firms |
| law-offices | Law Offices |
| real-estate-agents | Real Estate Agents |
| mortgage-brokers | Mortgage Brokers |
| insurance-agents | Insurance Agents |
| financial-advisors | Financial Advisors |
| phone-repair | Phone Repair |
| computer-repair | Computer Repair |
| tutoring-services | Tutoring Services |
| music-lessons | Music Lessons |
| dance-studios | Dance Studios |
| martial-arts-schools | Martial Arts Schools |
| dry-cleaning | Dry Cleaning and Laundry |
| tailoring-alterations | Tailoring and Alterations |
| mobile-car-wash | Mobile Car Wash |
| auto-detailing-shops | Auto Detailing Shops |

---

## Workflow Per Page

1. I (Claude) write the Cursor prompt with all industry-specific copy
2. Paste into Cursor Agent — Cursor creates `/data/industries/[slug].json`
3. Check the page at `localhost:3000/for/[slug]`
4. QC against the checklist below
5. Fix any issues via follow-up Cursor prompt
6. Push

## QC Checklist (Per Page)
- [ ] No fabricated stats or made-up numbers
- [ ] No fake testimonials or social proof
- [ ] Pain point bodies are pain only (no solution in pain section)
- [ ] Hero subheading is industry-specific, not generic
- [ ] Eyebrow keyword is sr-only (not visible on screen)
- [ ] No duplicate headline (H1 ≠ bold subheading)
- [ ] No floating stars without a real testimonial
- [ ] All FAQ answers are honest and specific
- [ ] Pricing section uses the shared component
- [ ] Related industries link to real `/for/` pages
- [ ] Passes build with no TypeScript errors

---

## Reference Implementation

`/for/medical-spas` is the first completed page.
Use it as the visual and structural reference for all future pages.
When in doubt about format, look at how medical-spas.json is structured
and how IndustryLandingPage.tsx renders it.

