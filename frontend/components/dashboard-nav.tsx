"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { Cpu } from "lucide-react"

const NAV_LINKS = [
  { href: "/dashboard", label: "CLIENTS" },
  { href: "/dashboard/inbox", label: "INBOX" },
  { href: "/dashboard/simulate", label: "SIMULATE" },
  { href: "/dashboard/settings", label: "SETTINGS" },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full px-4 pt-4 lg:px-6 lg:pt-6"
    >
      <nav className="w-full border-2 border-foreground bg-background/80 backdrop-blur-sm px-6 py-3 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Cpu size={16} strokeWidth={1.5} />
            <span className="text-xs font-mono tracking-[0.15em] uppercase font-bold">COLLECT</span>
          </Link>

          {/* Center nav links */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => {
              const active = link.href === "/dashboard" 
                ? pathname === "/dashboard" 
                : pathname.startsWith(link.href)
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-[10px] font-mono tracking-[0.15em] uppercase transition-colors ${
                    active
                      ? "text-[#ea580c] font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Right side: New client button */}
          <Link href="/dashboard/clients/new">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-foreground text-background px-4 py-2 text-[10px] font-mono tracking-[0.15em] uppercase font-bold"
            >
              + NEW_CLIENT
            </motion.button>
          </Link>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex items-center gap-3 mt-3 pt-3 border-t border-border">
          {NAV_LINKS.map((link) => {
            const active = link.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(link.href)

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[10px] font-mono tracking-[0.15em] uppercase transition-colors ${
                  active
                    ? "text-[#ea580c] font-bold"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </motion.div>
  )
}
