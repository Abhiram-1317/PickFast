import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "PickFast",
  description: "Affiliate discovery, comparison, and recommendation UI"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="glass sticky top-0 z-50 border-x-0 border-t-0">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link href="/" className="btn-micro inline-flex items-center gap-2 rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-3 py-1.5">
              <span className="text-sm font-extrabold tracking-wide text-slate-900 dark:text-white">PickFast</span>
              <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-950">
                Store
              </span>
            </Link>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
              <span className="rounded-full border border-slate-300/80 bg-white/70 px-2.5 py-1 dark:border-white/15 dark:bg-white/5">
                Daily top picks
              </span>
              <span className="rounded-full border border-slate-300/80 bg-white/70 px-2.5 py-1 dark:border-white/15 dark:bg-white/5">
                Price drop alerts
              </span>
              <span className="rounded-full border border-slate-300/80 bg-white/70 px-2.5 py-1 dark:border-white/15 dark:bg-white/5">
                Affiliate deals
              </span>
            </div>
          </div>

          <nav className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 border-t border-slate-200/80 px-4 py-2 text-sm dark:border-white/10 sm:px-6">
            <Link href="/" className="btn-micro rounded-lg bg-slate-900 px-3 py-1.5 font-semibold text-white dark:bg-white dark:text-slate-900">
              Home
            </Link>
            <Link href="/discover" className="btn-micro rounded-lg border border-slate-300/80 bg-white/70 px-3 py-1.5 font-medium text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200">
              Shop All
            </Link>
            <Link href="/recommendations" className="btn-micro rounded-lg border border-slate-300/80 bg-white/70 px-3 py-1.5 font-medium text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200">
              Recommendations
            </Link>
            <Link href="/compare" className="btn-micro rounded-lg border border-slate-300/80 bg-white/70 px-3 py-1.5 font-medium text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200">
              Compare
            </Link>
            <Link href="/shortlist" className="btn-micro rounded-lg border border-slate-300/80 bg-white/70 px-3 py-1.5 font-medium text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200">
              Wishlist
            </Link>
            <Link href="/admin" className="btn-micro rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-1.5 font-medium text-rose-700 dark:text-rose-200">
              Admin
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
