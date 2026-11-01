import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted fonts — no network access required at build time.
const manrope = localFont({
  src: [
    { weight: "400", path: "../fonts/manrope-400.woff2" },
    { weight: "500", path: "../fonts/manrope-500.woff2" },
    { weight: "600", path: "../fonts/manrope-600.woff2" },
    { weight: "700", path: "../fonts/manrope-700.woff2" },
    { weight: "800", path: "../fonts/manrope-800.woff2" },
  ],
  variable: "--font-manrope",
  display: "swap",
});

const archivo = localFont({
  src: [
    { weight: "600", path: "../fonts/archivo-600.woff2" },
    { weight: "700", path: "../fonts/archivo-700.woff2" },
    { weight: "800", path: "../fonts/archivo-800.woff2" },
    { weight: "900", path: "../fonts/archivo-900.woff2" },
  ],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tereverus TV — Live Broadcast",
  description:
    "Tereverus TV. Inspire. Inform. Entertain. Your continuous live broadcast channel.",
};

export const viewport: Viewport = {
  themeColor: "#08080b",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${archivo.variable}`}>
      <body className="bg-ink-950 font-sans text-zinc-200 antialiased">
        {children}
      </body>
    </html>
  );
}
