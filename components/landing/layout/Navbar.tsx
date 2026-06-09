"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "../../animations/gsapConfig";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
];

export default function Navbar() {
  const navRef = useRef<HTMLElement>(null);
  const linksRef = useRef<HTMLUListElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const workspaceHref = "/sign-in";

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.05 });

      tl.fromTo(
        nav,
        { opacity: 0, y: -16 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
      );

      if (linksRef.current) {
        tl.fromTo(
          linksRef.current.querySelectorAll("li"),
          { opacity: 0, y: -8 },
          { opacity: 1, y: 0, duration: 0.45, ease: "power2.out", stagger: 0.07 },
          "-=0.25"
        );
      }
    });

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 36);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      ref={navRef}
      className={[
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-black/70 backdrop-blur-2xl border-b border-white/[0.06] shadow-[0_1px_0_rgba(255,255,255,0.04)]"
          : "bg-transparent",
      ].join(" ")}
      role="banner"
    >
      <nav
        className="max-w-6xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between relative"
        aria-label="Main navigation"
      >
        {/* Left Side: Logo */}
        <div className="flex-1 flex justify-start">
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
            <span>
              Nexus<span className="gradient-text"> AI</span>
            </span>
          </Link>
        </div>

        {/* Center: Navigation Links (Perfectly Centered via absolute positioning) */}
        <ul ref={linksRef} className="hidden md:flex items-center justify-center gap-8 absolute left-1/2 -translate-x-1/2">
          {navLinks.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                className="text-sm font-medium text-white/45 hover:text-white transition-colors duration-200 relative group"
              >
                {item.label}
                <span
                  className="absolute -bottom-0.5 left-0 w-0 h-px bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] group-hover:w-full transition-all duration-300"
                  aria-hidden="true"
                />
              </a>
            </li>
          ))}
        </ul>

        {/* Right Side: CTA Button and Mobile Menu */}
        <div className="flex-1 flex justify-end items-center gap-4">
          <Link
            href={workspaceHref}
            className="hidden md:inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold btn-violet"
          >
            Open Workspace
          </Link>

          <button
            className="md:hidden flex flex-col gap-[5px] p-2 group"
            aria-label="Open navigation menu"
            type="button"
          >
            <span className="block w-5 h-0.5 bg-white/40 group-hover:bg-white transition-colors rounded-full" />
            <span className="block w-3.5 h-0.5 bg-white/40 group-hover:bg-white transition-colors rounded-full" />
            <span className="block w-5 h-0.5 bg-white/40 group-hover:bg-white transition-colors rounded-full" />
          </button>
        </div>
      </nav>
    </header>
  );
}
