import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { Toaster } from "sonner";

import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });

// Wąski, pochylony krój w duchu numerów startowych - używany w nagłówkach i liczbach.
const display = Barlow_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
  style: ["italic", "normal"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "93 Trening", template: "%s - 93 Trening" },
  description: "Plany treningowe, logowanie serii z RPE, progresja, dieta i suplementacja.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "93 Trening" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f3f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
  width: "device-width",
  initialScale: 1,
  // Bez skalowania - przypadkowy zoom w trakcie serii tylko przeszkadza.
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" suppressHydrationWarning className={`h-full ${inter.variable} ${display.variable}`}>
      <body className="min-h-full antialiased">
        <ThemeProvider>
          {children}
          <Toaster position="top-center" richColors closeButton theme="system" />
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </body>
    </html>
  );
}
