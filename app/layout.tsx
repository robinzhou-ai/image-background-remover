import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BG Remover — AI Image Background Removal",
  description: "Remove image backgrounds in seconds with AI. Free, fast, and privacy-first.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
