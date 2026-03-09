import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MK Metal Indo",
  description:
    "Jasa laser cutting, bending CNC, shearing, dan fabrikasi untuk bengkel & produksi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${manrope.variable} bg-charcoal text-text-light antialiased`}>
        {children}
      </body>
    </html>
  );
}
