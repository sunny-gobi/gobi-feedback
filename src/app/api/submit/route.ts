import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { OTHER_PREFIX, allQuestions, isAnswered, isVisible, type Answers } from "@/lib/questions";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return "91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Server is not configured" }, { status: 500 });
  }

  let body: { answers?: Answers; ref?: string | null; durationSeconds?: number | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const raw = body.answers;
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Keep only known questions, sanitise values, validate required ones.
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
  if (missing.length) {
    return NextResponse.json({ error: "Some required answers are missing", missing }, { status: 400 });
  }

  const ref = typeof body.ref === "string" ? body.ref.slice(0, 100) : null;
  const outreachId = ref && UUID_RE.test(ref) ? ref : null;
  const phone = normalisePhone(String(answers.whatsapp ?? ""));
  const duration =
    typeof body.durationSeconds === "number" && Number.isFinite(body.durationSeconds)
      ? Math.max(0, Math.min(86400, Math.round(body.durationSeconds)))
      : null;

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase.from("feedback_responses").insert({
    outreach_id: outreachId,
    ref,
    name: answers.q1 ?? null,
    city: answers.q2 ?? null,
    whatsapp_number: phone || null,
    usage_frequency: answers.q14 ?? null,
    disappointment: answers.q20 ?? null,
    wants_call: answers.q32 === "Yes, WhatsApp me",
    answers,
    user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
    duration_seconds: duration,
  });

  if (error) {
    console.error("feedback insert failed", error);
    return NextResponse.json({ error: "Could not save your answers. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
