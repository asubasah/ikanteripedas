"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { navLinks } from "@/data/homepage";

const whatsappLink = "https://wa.me/628113195800";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="bg-gradient-to-r from-maroon via-maroon-600 to-maroon text-center text-[10px] uppercase tracking-[0.2em] text-white/80">
        <div className="shell py-1.5">
          Workshop: Jl. Tambak Sawah No.6B, Waru, Sidoarjo • Telp (031) 9969 4300 • WA 0811 3195 800
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
