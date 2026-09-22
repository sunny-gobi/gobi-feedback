import Survey from "@/components/SurveyLoader";

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const refId = first(sp.ref) ?? null;
  const name = first(sp.name);
  const phone = first(sp.phone);
  const step = first(sp.step);
  const jumpTo =
    process.env.NODE_ENV === "development" && step !== undefined ? Number(step) : undefined;
  return (
    <Survey
      jumpTo={Number.isFinite(jumpTo) ? jumpTo : undefined}
      refId={refId}
      prefill={{
        name: name?.slice(0, 80),
        phone: phone?.replace(/[^\d]/g, "").slice(-10),
      }}
    />
  );
}
