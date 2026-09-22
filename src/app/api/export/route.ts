import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { allQuestions } from "@/lib/questions";

export const runtime = "nodejs";

/**
 * CSV export of all responses, for pulling into a Google Sheet:
 *   =IMPORTDATA("https://<host>/api/export?token=<EXPORT_TOKEN>")
 * Requires EXPORT_TOKEN and SUPABASE_SERVICE_ROLE_KEY env vars.
 */
export async function GET(req: NextRequest) {
  const token = process.env.EXPORT_TOKEN;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !url || !key) {
    return NextResponse.json({ error: "Export is not configured" }, { status: 503 });
  }
  if (req.nextUrl.searchParams.get("token") !== token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("feedback_responses")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const meta = ["id", "created_at", "whatsapp_number", "outreach_id", "ref", "duration_seconds", "voucher_paid_at", "notes"];
  const header = [...meta, ...allQuestions.map((q) => q.id)];
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = Array.isArray(v) ? v.join(" | ") : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = (data ?? []).map((r) => {
    const a = (r.answers ?? {}) as Record<string, unknown>;
    return [...meta.map((m) => esc(r[m])), ...allQuestions.map((q) => esc(a[q.id]))].join(",");
  });
  const csv = "﻿" + [header.join(","), ...rows].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=gobi-feedback-responses.csv",
      "Cache-Control": "no-store",
    },
  });
}
