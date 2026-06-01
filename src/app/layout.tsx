import type { Metadata } from "next";
import { Playwrite_GB_S } from "next/font/google";
import "./globals.css";

// "Cause" is not available in next/font/google, so it is loaded
// via @font-face in globals.css using a Google Fonts @import.
const playwrite = Playwrite_GB_S({
  variable: "--font-playwrite",
  display: "swap",
});

export const metadata: Metadata = {
  title: "easyytodo",
  description: "Today's work, sorted.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playwrite.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
