import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "One82",
  description: "AI-powered transaction analytics for merchants",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

