import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

// const manrope = Manrope({
//   subsets: ["latin"],
//   variable: "--font-manrope",
//   weight: ["400", "500", "600", "700"],
// });

export const metadata: Metadata = {
  title: "MK Metalindo - Jasa Laser Cutting, Bending CNC & Fabrikasi Sidoarjo",
  description: "Bengkel spesialis laser cutting plat & pipa, bending CNC, shearing, dan fabrikasi metal di Sidoarjo. Presisi, cepat, dan profesional.",
};

import ChatWidgetWrapper from "@/components/ChatWidgetWrapper";

import { LanguageProvider } from '@/context/LanguageContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <LanguageProvider>
          {children}
          <ChatWidgetWrapper />
        </LanguageProvider>
      </body>
    </html>
  );
}
