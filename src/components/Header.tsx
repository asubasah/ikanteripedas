"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { navLinks, socialLinks } from "@/data/homepage";

const whatsappLink = "https://wa.me/628113195800";

const SocialIcon = ({ name }: { name: string }) => {
  switch (name) {
    case "YouTube":
      return <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M23.5 6.2c-.3-1.1-1.1-1.9-2.2-2.2C19.3 3.5 12 3.5 12 3.5s-7.3 0-9.3.5c-1.1.3-1.9 1.1-2.2 2.2C0 8.2 0 12.3 0 12.3s0 4.1.5 6.1c.3 1.1 1.1 1.9 2.2 2.2 2 1 9.3 1 9.3 1s7.3 0 9.3-1c1.1-.3 1.9-1.1 2.2-2.2.5-2 .5-6.1.5-6.1s0-4.1-.5-6.1zM9.5 15.5V9l6.3 3.2-6.3 3.3z" /></svg>;
    case "Facebook":
      return <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>;
    case "Instagram":
      return <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36.105.415 2.227.055 1.265.07 1.648.07 4.85s-.015 3.585-.07 4.85c-.055 1.17-.249 1.805-.415 2.227-.217.562-.477.96-.896 1.382-.42.419-.819.679-1.381.896-.422.164-1.056.36-2.227.415-1.265.055-1.648.07-4.85.07s-3.585-.015-4.850-.07c-1.170-.055-1.805-.249-2.227-.415-.562-.217-.960-.477-1.382-.896-.419-.420-.679-.819-.896-1.381-.164-.422-.361-1.056-.415-2.227-.055-1.265-.070-1.648-.070-4.85s.015-3.585.070-4.85c.055-1.17.249-1.805.415-2.227.217-.562.477-.96.896-1.382.42-.419.82-.679 1.381-.896.422-.164 1.056-.36 2.227-.415 1.265-.055 1.648-.07 4.85-.07zM12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>;
    case "TikTok":
      return (
        <Image
          src="/images/logo/tik-tok.png"
          alt="TikTok"
          width={16}
          height={16}
          className="h-4 w-4 object-contain brightness-0 invert"
        />
      );
    case "Twitter":
      return <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.292 19.497h2.039L6.486 3.24H4.298l13.311 17.41z" /></svg>;
    case "LinkedIn":
      return <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.454c.98 0 1.775-.773 1.775-1.729V1.729C24 .774 23.205 0 22.225 0z" /></svg>;
    default:
      return null;
  }
};

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="bg-gradient-to-r from-maroon via-maroon-600 to-maroon text-white/90">
        <div className="shell flex items-center justify-between py-1.5 min-h-[32px]">
          <div className="text-[10px] uppercase tracking-[0.2em] font-medium hidden md:block">
            Workshop: Jl. Tambak Sawah No.6B, Waru, Sidoarjo • Telp (031) 9969 4300 • WA 0811 3195 800
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] font-medium md:hidden text-center flex-1">
            Sidoarjo • WA 0811 3195 800
          </div>
          <div className="flex items-center gap-3 ml-auto">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber transition-colors duration-200"
                aria-label={social.name}
              >
                <SocialIcon name={social.name} />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-b border-white/5 bg-charcoal-800/80 backdrop-blur-xl text-white">
        <div className="shell flex items-center justify-between py-4">
          <Link href="#hero" className="group no-underline">
            <div className="flex items-center gap-3">
              <div className="relative h-16 w-16 shrink-0 flex items-center justify-center bg-white rounded-xl p-2 shadow-md">
                <Image
                  src="/images/logo/logo_mkmetalindo_hires.png"
                  alt="MK Metal Indo Logo"
                  width={56}
                  height={56}
                  className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-300"
                  priority
                />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold tracking-tight text-white m-0">MK Metal Indo</p>
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    ONLINE
                  </span>
                </div>
                <p className="text-sm text-text-muted m-0">High Precision Fabrication</p>
              </div>
            </div>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-text-muted lg:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-white hover:translate-y-[-1px] no-underline text-text-muted">
                {link.label}
              </Link>
            ))}
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="metallic-shine rounded-full bg-gradient-to-r from-amber to-amber-strong px-6 py-2.5 text-sm font-bold text-charcoal shadow-xl shadow-amber/20 hover:scale-105 transition-transform no-underline text-charcoal"
            >
              Chat WhatsApp
            </a>
          </nav>
          <button
            onClick={() => setOpen((prev) => !prev)}
            className="lg:hidden rounded-xl border border-white/10 p-2 text-white hover:bg-white/5 transition-colors"
            aria-label="Toggle navigation"
          >
            <div className="flex flex-col gap-1 w-6">
              <span className="block h-0.5 w-full bg-white"></span>
              <span className="block h-0.5 w-full bg-white"></span>
              <span className="block h-0.5 w-full bg-white"></span>
            </div>
          </button>
        </div>
        {open && (
          <div className="shell pb-4 lg:hidden">
            <div className="space-y-2 rounded-2xl border border-white/10 bg-[#16161b] p-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/5"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl bg-gradient-to-r from-[#ffb347] to-[#ff9c1a] px-3 py-2 text-center text-sm font-semibold text-[#1b1b1f]"
                onClick={() => setOpen(false)}
              >
                Chat WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
