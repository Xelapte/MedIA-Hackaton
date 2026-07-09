import type { Metadata } from "next";
import { Zilla_Slab, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { Suspense } from "react";
import Nav from "@/components/Nav";
import { LanguageProvider } from "@/lib/LanguageContext";
import "./globals.css";

const display = Zilla_Slab({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});
const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Verity — Real-time news, fact-checked",
  description:
    "Every claim traced to its source and stamped with a verdict, updated as stories break.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="bg-paper font-sans text-ink antialiased">
        <LanguageProvider>
          <Suspense fallback={<div className="h-14 border-b border-ink/10 bg-paper md:h-16" />}>
            <Nav />
          </Suspense>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
