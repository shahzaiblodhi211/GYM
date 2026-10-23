import type { Metadata, Viewport } from "next";
import { Geist, Oswald } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/pwa";
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
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#070708",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${oswald.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-black text-ink">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
