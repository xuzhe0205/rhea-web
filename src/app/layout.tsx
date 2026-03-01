import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RHEA",
  description: "RHEA Index — Collaborative Operator Lab",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}