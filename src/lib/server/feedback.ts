import { createClient } from "@supabase/supabase-js";
import { OTHER_PREFIX, allQuestions, isAnswered, isVisible, type Answers } from "@/lib/questions";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SaveStatus = "in_progress" | "completed";

export interface SavePayload {
  sessionId?: unknown;
  answers?: unknown;
  ref?: unknown;
  step?: unknown;
  durationSeconds?: unknown;
}

export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return "91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

/** Keep only known, currently visible questions; trim and cap values; drop unknown options. */
export function sanitiseAnswers(raw: Answers): { answers: Answers; missing: string[] } {
  const answers: Answers = {};
  const missing: string[] = [];
  for (const q of allQuestions) {
    if (!isVisible(q, raw)) continue;
    let v = raw[q.id];
    if (Array.isArray(v)) v = v.filter((x) => typeof x === "string").map((x) => x.trim().slice(0, 500));
    else if (typeof v === "string") v = v.trim().slice(0, 3000);
    else v = undefined;
    if (q.options && v !== undefined) {
      const allowed = (x: string) => q.options!.includes(x) || (q.other && x.startsWith(OTHER_PREFIX));
      if (Array.isArray(v)) v = v.filter(allowed);
      else if (!allowed(v)) v = undefined;
    }
    if (v !== undefined) answers[q.id] = v;
    if (!q.optional && !isAnswered(q, { ...raw, [q.id]: v })) missing.push(q.id);
  }
  return { answers, missing };
}

export function parsePayload(body: SavePayload) {
  const raw = body.answers;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const sessionId = typeof body.sessionId === "string" && UUID_RE.test(body.sessionId) ? body.sessionId : null;
  const ref = typeof body.ref === "string" ? body.ref.slice(0, 100) : null;
  const outreachId = ref && UUID_RE.test(ref) ? ref : null;
  const step =
    typeof body.step === "number" && Number.isFinite(body.step) ? Math.max(0, Math.min(99, Math.round(body.step))) : null;
  const duration =
    typeof body.durationSeconds === "number" && Number.isFinite(body.durationSeconds)
      ? Math.max(0, Math.min(86400, Math.round(body.durationSeconds)))
      : null;
  return { raw: raw as Answers, sessionId, ref, outreachId, step, duration };
}

/** Upsert the session's row via the security-definer RPC (anon key can only touch its own session). */
export async function saveResponse(opts: {
  status: SaveStatus;
  sessionId: string | null;
  answers: Answers;
  ref: string | null;
  outreachId: string | null;
  step: number | null;
  duration: number | null;
  userAgent: string | null;
}): Promise<{ error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { error: "Server is not configured" };

  const { answers, status } = opts;
  const phone = normalisePhone(String(answers.whatsapp ?? ""));
  const wantsCall =
    answers.q32 === undefined && status === "in_progress" ? null : answers.q32 === "Yes, WhatsApp me";

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase.rpc("save_feedback_response", {
    p_session_id: opts.sessionId,
    p_status: status,
    p_last_step: opts.step,
    p_ref: opts.ref,
    p_outreach_id: opts.outreachId,
    p_name: answers.q1 ?? null,
    p_city: answers.q2 ?? null,
    p_whatsapp_number: phone || null,
    p_usage_frequency: answers.q14 ?? null,
    p_disappointment: answers.q20 ?? null,
    p_wants_call: wantsCall,
    p_answers: answers,
    p_user_agent: opts.userAgent,
    p_duration_seconds: opts.duration,
  });
  if (error) {
    console.error(`feedback ${status} save failed`, error);
    return { error: error.message };
  }
  return { error: null };
}
