import "./globals.css";
import { Inter } from "next/font/google";
import Navbar from "../components/Navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "PickFast | Smart Product Discovery",
  description:
    "Find, compare, and buy the best products with data-driven recommendations powered by PickFast.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-slate-50 text-slate-900 antialiased">
        <Navbar />
        <div className="min-h-[calc(100vh-57px)]">{children}</div>
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} PickFast &mdash; Product Intelligence Platform
        </footer>
      </body>
    </html>
  );
}
