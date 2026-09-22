"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Answers,
  OTHER_PREFIX,
  Question,
  isAnswered,
  isVisible,
  sections,
} from "@/lib/questions";
import { useAutosave } from "./useAutosave";

const DRAFT_KEY = "gobi-feedback-draft-v1";

interface Draft {
  /** Identifies this run through the form; partial saves upsert on it. */
  sessionId: string;
  step: number;
  answers: Answers;
  startedAt: number;
}

function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

interface Props {
  refId: string | null;
  prefill: { name?: string; phone?: string };
  /** Dev only: open the form at this step (0 = intro, 1..7 = sections, 8 = thank-you). */
  jumpTo?: number;
}

/** Runs on the client only (this component is loaded with ssr: false). */
function loadDraft(prefill: Props["prefill"], jumpTo?: number): Draft {
  let d: Draft = { sessionId: newSessionId(), step: 0, answers: {}, startedAt: 0 };
  if (process.env.NODE_ENV === "development" && jumpTo !== undefined) {
    return { ...d, step: Math.max(0, Math.min(sections.length + 1, jumpTo)), startedAt: Date.now() };
  }
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Draft>;
      if (parsed && parsed.answers) {
        d = {
          // Drafts saved before autosave existed have no session id; give them one.
          sessionId: typeof parsed.sessionId === "string" ? parsed.sessionId : d.sessionId,
          step: Math.min(parsed.step ?? 0, sections.length),
          answers: parsed.answers,
          startedAt: parsed.startedAt ?? 0,
        };
      }
    }
  } catch {}
  if (prefill.name && !d.answers.q1) d.answers = { ...d.answers, q1: prefill.name };
  if (prefill.phone && !d.answers.whatsapp) d.answers = { ...d.answers, whatsapp: prefill.phone };
  return d;
}

export default function Survey({ refId, prefill, jumpTo }: Props) {
  const [initial] = useState<Draft>(() => loadDraft(prefill, jumpTo));
  const sessionId = initial.sessionId;
  const [step, setStep] = useState(initial.step);
  const [answers, setAnswers] = useState<Answers>(initial.answers);
  const [startedAt, setStartedAt] = useState<number>(initial.startedAt);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Persist draft
  useEffect(() => {
    if (step > sections.length) return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ sessionId, step, answers, startedAt } satisfies Draft),
      );
    } catch {}
  }, [sessionId, answers, step, startedAt]);

  // Save every entry to the server as the user goes, so drop-offs are captured.
  const inForm = step >= 1 && step <= sections.length;
  const autosave = useAutosave(inForm ? { sessionId, answers, step, ref: refId, startedAt } : null);

  const setAnswer = useCallback((id: string, value: string | string[] | undefined) => {
    setAnswers((a) => ({ ...a, [id]: value }));
    setErrors((e) => {
      if (!e.has(id)) return e;
      const n = new Set(e);
      n.delete(id);
      return n;
    });
  }, []);

  const section = step >= 1 && step <= sections.length ? sections[step - 1] : null;
  const visibleQuestions = useMemo(
    () => (section ? section.questions.filter((q) => isVisible(q, answers)) : []),
    [section, answers],
  );

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const start = () => {
    if (!startedAt) setStartedAt(Date.now());
    setStep(1);
    scrollTop();
  };

  const validate = (): boolean => {
    const missing = visibleQuestions
      .filter((q) => !q.optional && !isAnswered(q, answers))
      .map((q) => q.id);
    setErrors(new Set(missing));
    if (missing.length) {
      requestAnimationFrame(() => {
        document
          .getElementById(`q-${missing[0]}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return false;
    }
    return true;
  };

  const next = async () => {
    if (!validate()) return;
    if (step < sections.length) {
      setStep(step + 1);
      scrollTop();
      return;
    }
    await submit();
  };

  const back = () => {
    setErrors(new Set());
    setStep(Math.max(0, step - 1));
    scrollTop();
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    autosave.stop();
    // Drop answers to questions that are no longer visible (branch changed)
    const clean: Answers = {};
    for (const s of sections)
      for (const q of s.questions)
        if (isVisible(q, answers) && answers[q.id] !== undefined) clean[q.id] = answers[q.id];
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          answers: clean,
          ref: refId,
          step: sections.length,
          durationSeconds: startedAt ? Math.round((Date.now() - startedAt) / 1000) : null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Something went wrong (${res.status})`);
      }
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
      setStep(sections.length + 1);
      scrollTop();
    } catch (e) {
      autosave.resume();
      setSubmitError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const progress = step === 0 ? 0 : Math.min(100, Math.round(((step - 1) / sections.length) * 100));

  if (step === 0) return <Intro onStart={start} hasDraft={startedAt > 0} />;

  if (step > sections.length) return <Done name={typeof answers.q1 === "string" ? answers.q1 : ""} />;

  return (
    <div className="min-h-dvh flex flex-col" ref={topRef}>
      <header className="sticky top-0 z-10 bg-cream/90 backdrop-blur border-b border-black/5">
        <div className="mx-auto max-w-xl px-4 py-3 flex items-center gap-3">
          <Image src="/brand/logo-h.png" alt="Gobi" width={78} height={27} priority />
          <div className="flex-1 h-2 rounded-full bg-black/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gobi-yellow to-gobi-orange transition-all duration-500"
              style={{ width: `${Math.max(4, progress)}%` }}
            />
          </div>
          <span className="text-xs font-bold text-black/50 tabular-nums">
            {step}/{sections.length}
          </span>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-xl px-4 pb-32">
        <div className="pt-6 pb-2">
          <h1 className="text-2xl font-black leading-tight">{section!.title}</h1>
          {section!.intro && <p className="text-black/60 font-semibold mt-1">{section!.intro}</p>}
        </div>

        <div className="mt-4 space-y-8">
          {visibleQuestions.map((q) => (
            <QuestionBlock
              key={q.id}
              q={q}
              value={answers[q.id]}
              onChange={(v) => setAnswer(q.id, v)}
              error={errors.has(q.id)}
            />
          ))}
        </div>
      </main>

      <footer className="fixed bottom-0 inset-x-0 z-10 bg-cream/95 backdrop-blur border-t border-black/5 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-xl px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={back}
            className="px-4 py-3 rounded-2xl font-bold text-black/60 hover:bg-black/5 active:scale-95 transition"
          >
            Back
          </button>
          <div className="flex-1 text-sm text-red-600 font-semibold">
            {errors.size > 0 && "Please answer the highlighted questions."}
            {submitError && submitError}
          </div>
          <button
            type="button"
            onClick={next}
            disabled={submitting}
            className="px-6 py-3 rounded-2xl font-black bg-black text-white shadow-lg shadow-black/20 active:scale-95 transition disabled:opacity-50"
          >
            {submitting ? "Sending…" : step === sections.length ? "Submit" : "Next"}
          </button>
        </div>
      </footer>
    </div>
  );
}

/* ---------- Intro & Done ---------- */

function Intro({ onStart, hasDraft }: { onStart: () => void; hasDraft: boolean }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 mx-auto w-full max-w-xl px-5 pt-10 pb-10 flex flex-col">
        <Image src="/brand/logo-h.png" alt="Gobi" width={140} height={48} priority />
        <h1 className="mt-8 text-3xl font-black leading-tight">
          Tell us the truth about Gobi.
        </h1>
        <p className="mt-6 text-lg font-semibold text-black/80 leading-relaxed">
          We&apos;d rather hear what&apos;s broken than what&apos;s nice. Honest beats polite,
          every time.
        </p>
        <ul className="mt-6 space-y-3 text-black/75 font-medium">
          <li className="flex gap-3">
            <span className="text-xl">⏱️</span>
            <span>Takes about 12–15 minutes. Your answers are saved as you go, so you can step away and pick up where you left off on this device.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-xl">🎁</span>
            <span>
              Complete, thoughtful answers earn a <b>₹500 Amazon voucher</b>, sent to your WhatsApp
              within 7–10 business days.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-xl">🔒</span>
            <span>
              Your answers stay with the Gobi team. We never share them or your number, and nothing
              is published with your name on it.
            </span>
          </li>
        </ul>
        <div className="mt-auto pt-10">
          <button
            type="button"
            onClick={onStart}
            className="w-full py-4 rounded-2xl font-black text-lg bg-black text-white shadow-lg shadow-black/20 active:scale-[0.98] transition"
          >
            {hasDraft ? "Continue where I left off" : "Let's go"}
          </button>
        </div>
      </main>
    </div>
  );
}

function Done({ name }: { name: string }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 mx-auto w-full max-w-xl px-5 py-10 flex flex-col items-center justify-center text-center">
        <Image src="/brand/logo-h.png" alt="Gobi" width={140} height={48} />
        <h1 className="mt-12 text-3xl font-black">That&apos;s a wrap! 🙌</h1>
        <p className="mt-4 text-lg font-semibold text-black/80">
          Thank you for being honest with us{name ? `, ${name.split(" ")[0]}` : ""}. We&apos;ll read
          every word.
        </p>
        <p className="mt-4 text-black/70 font-medium">
          If your answers are complete, your ₹500 Amazon voucher will reach you on WhatsApp within
          7–10 business days.
        </p>
        <p className="mt-10 text-xl font-black">See you out there!</p>
      </main>
    </div>
  );
}

/* ---------- Question renderers ---------- */

function QuestionBlock({
  q,
  value,
  onChange,
  error,
}: {
  q: Question;
  value: string | string[] | undefined;
  onChange: (v: string | string[] | undefined) => void;
  error: boolean;
}) {
  return (
    <section
      id={`q-${q.id}`}
      className={`rounded-3xl bg-white p-5 shadow-sm border-2 transition ${
        error ? "border-red-400" : "border-transparent"
      }`}
    >
      <h2 className="text-lg font-extrabold leading-snug">
        {q.label}
        {q.optional && <span className="ml-2 text-xs font-bold text-black/40">optional</span>}
      </h2>
      {q.hint && <p className="mt-1 text-sm text-black/55 font-medium">{q.hint}</p>}
      <div className="mt-4">
        {q.type === "short" && (
          <input
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={q.placeholder}
            className={inputCls}
            maxLength={500}
          />
        )}
        {q.type === "phone" && (
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value.replace(/[^\d+ ]/g, ""))}
            placeholder={q.placeholder}
            className={inputCls}
            maxLength={16}
          />
        )}
        {q.type === "long" && (
          <textarea
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={q.placeholder ?? "Take your time. The details are the useful part."}
            rows={4}
            className={inputCls + " resize-y min-h-28"}
            maxLength={3000}
          />
        )}
        {q.type === "dropdown" && <Dropdown q={q} value={value as string} onChange={onChange} />}
        {q.type === "single" && <Single q={q} value={value as string} onChange={onChange} />}
        {q.type === "multi" && <Multi q={q} value={value as string[]} onChange={onChange} />}
        {q.type === "rank" && <Rank q={q} value={value as string[]} onChange={onChange} />}
      </div>
    </section>
  );
}

const inputCls =
  "w-full rounded-2xl border-2 border-black/10 bg-cream/60 px-4 py-3 text-base font-medium outline-none focus:border-gobi-orange focus:bg-white transition placeholder:text-black/35";

const optionBase =
  "w-full text-left rounded-2xl border-2 px-4 py-3 font-semibold transition active:scale-[0.98] select-none";
const optionOff = "border-black/10 bg-cream/50 hover:border-black/25";
const optionOn = "border-black bg-gobi-yellow text-black";

function OtherInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Tell us more…"}
      className={inputCls + " mt-2"}
      maxLength={300}
    />
  );
}

function Dropdown({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  const isOther = value?.startsWith(OTHER_PREFIX) ?? false;
  const selectValue = isOther ? "__other" : (value ?? "");
  return (
    <div>
      <div className="relative">
        <select
          value={selectValue}
          onChange={(e) => onChange(e.target.value === "__other" ? OTHER_PREFIX : e.target.value)}
          className={inputCls + " appearance-none pr-10"}
        >
          <option value="" disabled>
            Choose a city
          </option>
          {q.options!.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          {q.other && <option value="__other">{q.other}</option>}
        </select>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-black/50">▾</span>
      </div>
      {isOther && (
        <OtherInput
          value={value!.slice(OTHER_PREFIX.length)}
          onChange={(t) => onChange(OTHER_PREFIX + t)}
          placeholder="Which city?"
        />
      )}
    </div>
  );
}

function Single({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  const isOther = value?.startsWith(OTHER_PREFIX) ?? false;
  return (
    <div className="space-y-2">
      {q.options!.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`${optionBase} ${value === o ? optionOn : optionOff}`}
        >
          {o}
        </button>
      ))}
      {q.other && (
        <>
          <button
            type="button"
            onClick={() => !isOther && onChange(OTHER_PREFIX)}
            className={`${optionBase} ${isOther ? optionOn : optionOff}`}
          >
            {q.other}…
          </button>
          {isOther && (
            <OtherInput
              value={value!.slice(OTHER_PREFIX.length)}
              onChange={(t) => onChange(OTHER_PREFIX + t)}
            />
          )}
        </>
      )}
    </div>
  );
}

function Multi({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: string[] | undefined;
  onChange: (v: string[]) => void;
}) {
  const sel = value ?? [];
  const max = q.max ?? 99;
  const otherIdx = sel.findIndex((s) => s.startsWith(OTHER_PREFIX));
  const isOther = otherIdx >= 0;
  const full = sel.length >= max;

  const toggle = (o: string) => {
    if (sel.includes(o)) onChange(sel.filter((s) => s !== o));
    else if (!full) onChange([...sel, o]);
  };
  const toggleOther = () => {
    if (isOther) onChange(sel.filter((_, i) => i !== otherIdx));
    else if (!full) onChange([...sel, OTHER_PREFIX]);
  };
  const setOtherText = (t: string) =>
    onChange(sel.map((s, i) => (i === otherIdx ? OTHER_PREFIX + t : s)));

  return (
    <div className="space-y-2">
      {q.options!.map((o) => {
        const on = sel.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => toggle(o)}
            disabled={!on && full}
            className={`${optionBase} ${on ? optionOn : optionOff} disabled:opacity-40 flex items-center gap-3`}
          >
            <span
              className={`h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center text-xs ${
                on ? "border-black bg-black text-gobi-yellow" : "border-black/30"
              }`}
            >
              {on && "✓"}
            </span>
            {o}
          </button>
        );
      })}
      {q.other && (
        <>
          <button
            type="button"
            onClick={toggleOther}
            disabled={!isOther && full}
            className={`${optionBase} ${isOther ? optionOn : optionOff} disabled:opacity-40 flex items-center gap-3`}
          >
            <span
              className={`h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center text-xs ${
                isOther ? "border-black bg-black text-gobi-yellow" : "border-black/30"
              }`}
            >
              {isOther && "✓"}
            </span>
            {q.other}…
          </button>
          {isOther && (
            <OtherInput
              value={sel[otherIdx].slice(OTHER_PREFIX.length)}
              onChange={setOtherText}
            />
          )}
        </>
      )}
      <p className="text-xs font-semibold text-black/45 pt-1">
        {sel.length}/{max} selected
      </p>
    </div>
  );
}

function Rank({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: string[] | undefined;
  onChange: (v: string[]) => void;
}) {
  const sel = value ?? [];
  const max = q.max ?? 3;
  const toggle = (o: string) => {
    if (sel.includes(o)) onChange(sel.filter((s) => s !== o));
    else if (sel.length < max) onChange([...sel, o]);
  };
  return (
    <div className="space-y-2">
      {q.options!.map((o) => {
        const idx = sel.indexOf(o);
        const on = idx >= 0;
        return (
          <button
            key={o}
            type="button"
            onClick={() => toggle(o)}
            disabled={!on && sel.length >= max}
            className={`${optionBase} ${on ? optionOn : optionOff} disabled:opacity-40 flex items-center gap-3`}
          >
            <span
              className={`h-7 w-7 shrink-0 rounded-full border-2 flex items-center justify-center text-sm font-black ${
                on ? "border-black bg-black text-gobi-yellow" : "border-black/30 text-transparent"
              }`}
            >
              {on ? idx + 1 : "·"}
            </span>
            {o}
          </button>
        );
      })}
      <p className="text-xs font-semibold text-black/45 pt-1">
        {sel.length < max
          ? `Pick your #${sel.length + 1}`
          : "Top 3 locked in. Tap one to change it."}
      </p>
    </div>
  );
}
