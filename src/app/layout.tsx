import type { Metadata, Viewport } from "next";
import { Geist, Oswald } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Gym",
  description: "Log each workout, track missed days, and see what to lift next.",
  applicationName: "Gym",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gym",
  },
};

export const viewport: Viewport = {
  themeColor: "#090909",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${oswald.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-black text-ink">{children}</body>
    </html>
  );
}
