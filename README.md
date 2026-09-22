# Gobi user feedback form

Mobile-first web version of the Gobi user feedback questionnaire (32 questions, ~12–15 min).
Built with Next.js 16 (App Router) + Tailwind, responses stored in the `gobimaps` Supabase project.

## Run locally

```bash
npm install
npm run dev
```

`.env.local` needs:

```
NEXT_PUBLIC_SUPABASE_URL=https://khmqjkzidufhhqcccwmo.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# optional, enables /api/export
SUPABASE_SERVICE_ROLE_KEY=
EXPORT_TOKEN=
```

## Sharing links

Plain link works as is. For WhatsApp outreach you can prefill and attribute responses:

| Param   | Effect                                                                 |
| ------- | ---------------------------------------------------------------------- |
| `ref`   | Stored on the response. If it is a `feedback_outreach.id` UUID it is also linked in `outreach_id`. |
| `name`  | Prefills Q1.                                                           |
| `phone` | Prefills the WhatsApp number field (last 10 digits).                   |

Example: `https://<host>/?ref=<outreach uuid>&name=Priya&phone=9876543210`

## Where responses go

Table `public.feedback_responses` in Supabase, **one row per form session**:

- `answers` (jsonb) has every answer keyed by question id (`q1`…`q32`, `qa1`, `qa2`, `q16b`, `whatsapp`).
- Handy columns pulled out for filtering: `name`, `city`, `whatsapp_number`, `usage_frequency` (Q14), `disappointment` (Q20), `wants_call` (Q32), `duration_seconds`.
- `status` is `in_progress` until the user presses Submit, then `completed`. `last_step` is the highest section (1–7) they reached, `created_at` is when they started, `completed_at` when they submitted.
- `voucher_paid_at` and `notes` are for the team to track the ₹500 voucher.

RLS is on. The publishable key cannot read or update the table directly; writes go through the
`save_feedback_response` RPC, which upserts only the row for the caller's `session_id`.

### Partial saves (drop-offs)

Answers are saved to the server as the user goes, not just on Submit:

- The client generates a `session_id` (kept in localStorage with the draft) and calls `POST /api/save` about a second after each change, immediately on section change, and via `sendBeacon` when the tab is hidden or closed.
- `/api/save` sanitises but does not require anything; `/api/submit` validates all required questions and marks the same row `completed`.
- A completed row is never overwritten by a late partial save.

Drop-offs to follow up (left a number, never finished):

```sql
select name, whatsapp_number, last_step, updated_at
from feedback_responses
where status = 'in_progress' and whatsapp_number is not null;
```

## Mapping responses to outreach users

Each response is linked to its `feedback_outreach` row in one of two ways, in this order:

1. **Link param** – the WhatsApp message carries `?ref=<feedback_outreach.id>`; the id is stored in `outreach_id` and `ref`.
2. **Number match** – if no ref was passed, a database trigger looks up `feedback_outreach.number` (format `91XXXXXXXXXX`) using the WhatsApp number the person typed.

Query the view `feedback_responses_with_outreach` to see responses alongside the outreach user (username, city, platform, app usage, batch, stage) plus `matched_by` = `link` / `phone` / null (no match).

## Google Sheet export

Set `SUPABASE_SERVICE_ROLE_KEY` and a long random `EXPORT_TOKEN`, then in a Sheet:

```
=IMPORTDATA("https://<host>/api/export?token=<EXPORT_TOKEN>")
```

Completed submissions only by default. Add `&status=in_progress` for drop-offs or `&status=all` for everything; the CSV has `status`, `last_step`, `completed_at` and `updated_at` columns.

## Editing questions

Everything lives in `src/lib/questions.ts`: sections, copy, options, "other" text boxes, max picks, and branching (`showIf`).
