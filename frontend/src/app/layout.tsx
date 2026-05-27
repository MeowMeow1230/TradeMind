import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradeMind",
  description: "AI-powered trading strategy engine — generate, backtest, analyze, deploy on Mantle",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
