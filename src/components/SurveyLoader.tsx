"use client";

import dynamic from "next/dynamic";

// Client-only so the saved draft in localStorage can seed state without a hydration mismatch.
const Survey = dynamic(() => import("./Survey"), {
  ssr: false,
  loading: () => <div className="min-h-dvh" />,
});

export default function SurveyLoader(props: React.ComponentProps<typeof Survey>) {
  return <Survey {...props} />;
}
