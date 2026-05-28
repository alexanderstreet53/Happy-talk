import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gas Tank Detection",
  description: "Geospatial prospecting for industrial gas customers.",
};

const NAV = [
  { href: "/",        label: "Dashboard" },
  { href: "/zones",   label: "Zones" },
  { href: "/leads",   label: "Leads" },
  { href: "/review",  label: "Verify" },
  { href: "/label",   label: "Labelling" },
  { href: "/spend",   label: "Spend" },
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-7xl px-4 h-14 flex items-center gap-6">
            <Link href="/" className="font-semibold tracking-tight">Gas Tank Detection</Link>
            <nav className="flex gap-4 text-sm text-slate-600">
              {NAV.map(n => (
                <Link key={n.href} href={n.href} className="hover:text-ink">{n.label}</Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl w-full px-4 py-6 flex-1">{children}</main>
      </body>
    </html>
  );
}
