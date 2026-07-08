import type { Metadata } from "next";
import { Suspense } from "react";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Verity — Real-time news, fact-checked",
  description:
    "Real-time news aggregation with a transparent, source-traced fact-check layer.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-paper font-sans text-ink antialiased">
        <Suspense fallback={<div className="h-14 border-b border-black/10 bg-paper md:h-16" />}>
          <Nav />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
