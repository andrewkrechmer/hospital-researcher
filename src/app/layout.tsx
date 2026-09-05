import type { Metadata } from "next";

import { AppNav } from "@/components/layout/AppNav";

import "./globals.css";

export const metadata: Metadata = {
  title: "Hospitals Prospecting Database",
  description:
    "Explore, filter, and research U.S. hospitals and their health-system relationships.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <AppNav />
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
