# Multi-location (accounts)

## Product rules

| Tier | Max locations | Notes |
|------|----------------|--------|
| **Free** | **1** | Single review link / business (current default). |
| **Pro** | **3** | One primary + up to **2** additional locations (3 rows total). |
| **AI** | **15** | Same model; higher cap for franchises / multi-site operators. |

Each location is a full `businesses` row: its own **slug**, **review link**, templates, and stats. The **account root** row has `parent_business_id IS NULL`; extra locations point at the root with `parent_business_id = <root id>`. All locations share the same `user_id` (and billing tier on the root).

## Implementation (this repo)

- **Schema:** `parent_business_id` on `businesses` (self-FK, `ON DELETE CASCADE`). Partial unique index: at most **one root per `user_id`** (`WHERE parent_business_id IS NULL AND user_id IS NOT NULL`).
- **API:** `GET /api/my-business` returns `business` (root) + `locations[]` + `maxLocations`.
- **API:** `POST /api/businesses/add-location` creates a child row + default templates (Pro/AI only, under cap).
- **UI:** Dashboard lists locations and adds new ones (basics). Settings continue to edit the **primary** business until we add per-location settings switching.

## Future

- Per-location Settings / Google connect, delete/archive location, org dashboard rollups.
