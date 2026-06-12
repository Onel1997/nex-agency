import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { SCROLL_UNLOCK_INLINE_SCRIPT } from "@/lib/scrollUnlockScript";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NexAgency — Premium-Webdesign & KI-Marketing für lokale Unternehmen",
  description:
    "NexAgency entwickelt Premium-Websites, KI-Content-Systeme und Wachstumsstrategien für lokale Unternehmen in Deutschland — persönlich betreut und auf Anfragen ausgelegt.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen overflow-x-hidden bg-background text-foreground">
        <Script
          id="scroll-restoration"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: SCROLL_UNLOCK_INLINE_SCRIPT,
          }}
        />
        {children}
      </body>
    </html>
  );
}
