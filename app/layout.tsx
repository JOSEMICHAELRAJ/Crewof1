import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import NavLinks from "./NavLinks.tsx";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Collect — AI Payment Agent",
  description: "An AI agent that has awkward money conversations on your behalf",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="h-full flex flex-col" style={{ background: "var(--bg)" }}>
        <header
          style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
          className="flex items-center justify-between px-6 h-12 shrink-0 sticky top-0 z-20"
        >
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-sm tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            <span style={{ color: "var(--accent)" }}>◆</span> Collect
          </Link>
          <NavLinks />
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </body>
    </html>
  );
}
