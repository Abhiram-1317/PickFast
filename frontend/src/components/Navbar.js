"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/recommendations", label: "Recommended" },
  { href: "/compare", label: "Compare" },
  { href: "/shortlist", label: "Shortlist" },
  { href: "/admin", label: "Admin" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/40 bg-white/60 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-md shadow-emerald-500/30">
            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 64 64"><path d="M36 10L18 36h12L28 54l18-26H34L36 10z"/></svg>
          </div>
          <span className="text-xl font-extrabold tracking-tight text-slate-900">
            Pick<span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">Fast</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25"
                    : "text-slate-600 hover:bg-white/80 hover:text-slate-900 hover:shadow-sm"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <MobileMenu pathname={pathname} />
      </div>
    </header>
  );
}

function MobileMenu({ pathname }) {
  return (
    <details className="relative md:hidden" role="navigation">
      <summary className="cursor-pointer rounded-xl border border-white/40 bg-white/60 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-lg">
        Menu
      </summary>
      <div className="absolute right-0 top-full mt-1.5 w-52 rounded-2xl border border-white/40 bg-white/80 p-2 shadow-xl backdrop-blur-xl">
        {NAV_LINKS.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md"
                  : "text-slate-700 hover:bg-white/80"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </details>
  );
}
