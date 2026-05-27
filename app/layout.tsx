import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CursorGlow } from "@/components/cursor/CursorGlow";
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <CursorGlow />
        {children}
      </body>
    </html>
  );
}
