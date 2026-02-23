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
        <header className="glass sticky top-0 z-50 border-x-0 border-t-0 px-4 py-3 sm:px-6">
          <nav className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 text-sm">
            <Link href="/" className="btn-micro rounded-lg px-3 py-1.5 font-semibold text-slate-900 dark:text-slate-100">
              Home
            </Link>
            <Link href="/discover" className="btn-micro rounded-lg px-3 py-1.5 text-slate-700 dark:text-slate-200">
              Discover
            </Link>
            <Link href="/recommendations" className="btn-micro rounded-lg px-3 py-1.5 text-slate-700 dark:text-slate-200">
              Recommendations
            </Link>
            <Link href="/compare" className="btn-micro rounded-lg px-3 py-1.5 text-slate-700 dark:text-slate-200">
              Compare
            </Link>
            <Link href="/shortlist" className="btn-micro rounded-lg px-3 py-1.5 text-slate-700 dark:text-slate-200">
              Wishlist
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
