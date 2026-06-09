"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "../../animations/gsapConfig";

const footerLinks = [
  { label: "Features",     href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
];

export default function Footer() {
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll("[data-footer-reveal]"),
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power2.out",
          stagger: 0.08,
          scrollTrigger: {
            trigger: el,
            start: "top 95%",
            toggleActions: "play none none none",
          },
        }
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <footer
      ref={footerRef}
      className="border-t border-[rgba(139,92,246,0.12)] bg-[#07070E]"
      role="contentinfo"
    >
      {/* Upper row */}
      <div className="max-w-6xl mx-auto px-6 md:px-10 pt-10 pb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative">
        {/* Brand + tagline */}
        <div className="flex-1" data-footer-reveal>
          <Link
            href="/"
            className="flex items-center gap-2 font-display font-black text-lg tracking-tight text-white"
            aria-label="Nexus AI — home"
          >
            <Image
              src="/logo1.png"
              alt="Nexus AI logo"
              width={28}
              height={28}
              className="shrink-0"
              priority
            />
            <span className="font-display font-bold text-lg tracking-tight gradient-text block mb-1">
              Nexus AI
            </span>
          </Link>
          <p className="text-xs text-[#4A4468] max-w-[260px] leading-relaxed mt-2">
            Real-time collaborative architecture design. From plain English to
            a build-ready AI-agent spec.
          </p>
        </div>

        {/* Nav links */}
        <nav aria-label="Footer navigation" className="flex-1 flex md:justify-center" data-footer-reveal>
          <ul className="flex items-center gap-6 flex-wrap" role="list">
            {footerLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="text-xs font-medium text-[#6B6485] hover:text-[#A89FBF] transition-colors duration-200"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Bottom row */}
      <div className="max-w-6xl mx-auto px-6 md:px-10 h-12 flex items-center justify-between gap-4 border-t border-[rgba(139,92,246,0.07)]">
        <p className="text-xs text-[#3A3456]">
          © 2026 Nexus AI. All rights reserved.
        </p>
        <p className="text-xs text-[#3A3456]">
          Powered by Gemini · Liveblocks · Trigger.dev
        </p>
      </div>
    </footer>
  );
}
