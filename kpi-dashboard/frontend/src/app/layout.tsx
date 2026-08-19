import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KPI Dashboard — C4-NIL-5-85",
  description: "Station KPI dashboard with daily 10 PM alerts",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
