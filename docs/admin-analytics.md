# Admin Analytics Guide

## Accessing Admin Analytics

Navigate to `/admin/analytics` while logged in as an admin user.

Admin access requires either:
- `app_metadata.role === 'admin'` (set via Supabase dashboard)
- `user_metadata.role === 'admin'`
- Email matching `ADMIN_EMAIL` env var (legacy fallback)

---

## Reading the Data

### Aggregate KPIs (top row)
Shows totals across all businesses: count by tier, total requests sent, average conversion rate.

### Sortable Table

Click any column header to sort. Click again to reverse.

| Column | Meaning |
|--------|---------|
| Business | Name + whether Google is connected |
| Tier | free / pro / ai |
| Sent | Review requests sent in selected period |
| Conv% | Completed / Sent (overall conversion rate) |
| Rating | Current Google star rating |
| +Reviews/Mo | New Google reviews in last 30 days |
| Google Rev | Revenue attributed to Google reviews this month |
| ROI% | (Google Rev - Monthly Cost) / Monthly Cost × 100 |

Green ROI% = positive return. Red = negative (spending more than earning, though often means they haven't entered revenue data yet).

### Filters

- **Tier filter:** Show only free, pro, or AI businesses
- **Date range:** Changes the period for "Sent" and "Conv%" columns
- **Search:** Filter by business name

### Exporting

Click "Export CSV" to download all visible rows as a spreadsheet. Useful for sharing with stakeholders or building case studies.

---

## Interpreting the Data for Case Studies

**High-value businesses for case studies:**
- High conv% (>20%) + positive ROI = strong story
- Large review count increase (reviews_this_month > 5) = visible growth
- High attribution percentage = clear Google review dependency

**Businesses that need attention:**
- Zero requests sent = not using the product
- Very low conv% (<5%) = possible email deliverability issue or wrong audience
- No Google connected = missing data for Google stats section

---

## Individual Business View

Click any row to navigate to `/admin/businesses/{id}` for detailed view of that business.
