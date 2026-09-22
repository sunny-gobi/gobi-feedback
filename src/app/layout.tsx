import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gobi-feedback.vercel.app"),
  title: "Gobi · Tell us the truth",
  description: "A 12–15 minute questionnaire about how you go out, and how Gobi fits in.",
  robots: { index: false, follow: false },
  icons: { icon: "/brand/gobi-smiling.png" },
  openGraph: {
    title: "Gobi wants your honest feedback",
    description: "12–15 minutes, ₹500 Amazon voucher for complete answers.",
    images: ["/brand/gobi-smiling.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fff7e0",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
