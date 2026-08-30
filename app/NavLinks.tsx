"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/inbox", label: "Inbox" },
  { href: "/simulate", label: "Simulate" },
  { href: "/settings", label: "Settings" },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {LINKS.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="px-3 py-1 rounded text-sm transition-colors"
            style={{
              color: active ? "var(--text-primary)" : "var(--text-secondary)",
              background: active ? "var(--bg)" : "transparent",
              fontWeight: active ? 500 : 400,
            }}
          >
            {label}
          </Link>
        );
      })}
      <Link
        href="/clients/new"
        className="ml-2 px-3 py-1.5 rounded text-sm font-medium text-white"
        style={{ background: "var(--accent)" }}
      >
        + New Client
      </Link>
    </nav>
  );
}
