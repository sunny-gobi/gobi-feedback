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

Table `public.feedback_responses` in Supabase:

- `answers` (jsonb) has every answer keyed by question id (`q1`…`q32`, `qa1`, `qa2`, `q16b`, `whatsapp`).
- Handy columns pulled out for filtering: `name`, `city`, `whatsapp_number`, `usage_frequency` (Q14), `disappointment` (Q20), `wants_call` (Q32), `duration_seconds`.
- `voucher_paid_at` and `notes` are for the team to track the ₹500 voucher.

RLS is on. The publishable key can only insert (via the server route); nothing can be read with it.

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

## Editing questions

Everything lives in `src/lib/questions.ts`: sections, copy, options, "other" text boxes, max picks, and branching (`showIf`).
