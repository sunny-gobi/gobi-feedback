import { NextRequest, NextResponse } from "next/server";
import { parsePayload, sanitiseAnswers, saveResponse } from "@/lib/server/feedback";

export const runtime = "nodejs";

/**
 * Partial save: called on every answer change (debounced), on section change and
 * when the tab is hidden, so drop-offs still leave a row in feedback_responses.
 * Nothing is validated as required here; /api/submit does that on the final step.
 */
export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const p = parsePayload(body);
  if (!p || !p.sessionId) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { answers } = sanitiseAnswers(p.raw);
  if (Object.keys(answers).length === 0) return NextResponse.json({ ok: true, skipped: true });

  const { error } = await saveResponse({
    status: "in_progress",
    sessionId: p.sessionId,
    answers,
    ref: p.ref,
    outreachId: p.outreachId,
    step: p.step,
    duration: p.duration,
    userAgent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
  });
  if (error) return NextResponse.json({ error: "Could not save" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
