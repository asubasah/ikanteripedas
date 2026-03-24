import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MK Metal Indo - Jasa Laser Cutting, Bending CNC & Fabrikasi Sidoarjo",
  description: "Bengkel spesialis laser cutting plat & pipa, bending CNC, shearing, dan fabrikasi metal di Sidoarjo. Presisi, cepat, dan profesional.",
};

import ChatWidgetWrapper from "@/components/ChatWidgetWrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${manrope.variable} antialiased font-manrope bg-charcoal text-text-light`}>
        {children}
        <ChatWidgetWrapper />
      </body>
    </html>
  );
}
