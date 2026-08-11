import type { Metadata, Viewport } from "next";
import "./globals.css";
import { t } from "@/lib/strings";

export const metadata: Metadata = {
  title: t.appName,
  description: t.tagline,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
