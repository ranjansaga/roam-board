import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Roam Board",
  description: "AI-assisted travel planning on an accessible Kanban board.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <div className="flex min-h-dvh flex-col">
          <header className="border-b" style={{ borderColor: "var(--border)" }}>
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <Link href="/" className="font-semibold">
                Roam Board
              </Link>
              <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                AI itinerary + Kanban
              </span>
            </div>
          </header>
          <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
