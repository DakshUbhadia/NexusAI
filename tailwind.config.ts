import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./providers/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Dark mode surface hierarchy
        bg: {
          base:    "#07070E",   // deepest background
          surface: "#0E0E1A",   // card / panel surface
          raised:  "#13131F",   // elevated card
          border:  "rgba(139,92,246,0.15)",
        },
        // Brand / accent — violet elevated for dark contrast
        violet: {
          50:  "#F0EBFF",
          100: "#E0D5FF",
          200: "#C3ADFF",
          300: "#A585FF",
          400: "#8B5CF6",  // primary accent
          500: "#7C3AED",
          600: "#6D28D9",
          glow: "rgba(139,92,246,0.35)",
          soft: "rgba(139,92,246,0.08)",
        },
        // Indigo secondary
        indigo: {
          accent: "#6366F1",
          glow:   "rgba(99,102,241,0.3)",
        },
        // Text hierarchy
        text: {
          primary:   "#F0EEFF",
          secondary: "#A89FBF",
          muted:     "#6B6485",
          accent:    "#9B8FE8",
        },
      },
      fontFamily: {
        display: ["'Bricolage Grotesque'", "sans-serif"],
        body:    ["'DM Sans'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
      keyframes: {
        // Orb blob morph path animation
        morphBlob: {
          "0%, 100%": { borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%" },
          "25%":      { borderRadius: "30% 60% 70% 40% / 50% 60% 30% 60%" },
          "50%":      { borderRadius: "50% 60% 30% 60% / 30% 60% 70% 40%" },
          "75%":      { borderRadius: "60% 40% 60% 30% / 70% 30% 60% 40%" },
        },
        // Torus spin
        torusSpin: {
          "0%":   { transform: "rotateX(15deg) rotateY(0deg) rotateZ(5deg)" },
          "100%": { transform: "rotateX(15deg) rotateY(360deg) rotateZ(5deg)" },
        },
        // Ambient float
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-12px)" },
        },
        // Gradient sweep on text
        gradientSweep: {
          "0%":   { backgroundPosition: "0% 50%" },
          "50%":  { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        // Pulse glow ring
        pulseGlow: {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%":      { opacity: "0.8", transform: "scale(1.08)" },
        },
        // Chip cycling fade
        chipFadeIn: {
          "0%":   { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0px)" },
        },
        // Fade up reveal
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(32px)" },
          "100%": { opacity: "1", transform: "translateY(0px)" },
        },
        // Shimmer border
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        // Ticker/marquee
        marquee: {
          "0%":   { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        // Pricing pill slide
        pillSlide: {
          "0%":   { left: "2px" },
          "100%": { left: "calc(50% - 2px)" },
        },
      },
      animation: {
        morphBlob:      "morphBlob 8s ease-in-out infinite",
        torusSpin:      "torusSpin 20s linear infinite",
        float:          "float 5s ease-in-out infinite",
        gradientSweep:  "gradientSweep 4s ease infinite",
        pulseGlow:      "pulseGlow 3s ease-in-out infinite",
        chipFadeIn:     "chipFadeIn 0.5s ease-out forwards",
        fadeUp:         "fadeUp 0.7s ease-out forwards",
        shimmer:        "shimmer 2.5s linear infinite",
        marquee:        "marquee 24s linear infinite",
      },
      backgroundImage: {
        "radial-violet": "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(139,92,246,0.25), transparent)",
        "hero-glow":     "radial-gradient(ellipse 60% 80% at 80% 50%, rgba(139,92,246,0.18), transparent 70%)",
        "card-shine":    "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%)",
        "pricing-glow":  "radial-gradient(ellipse 70% 50% at 50% 100%, rgba(139,92,246,0.12), transparent)",
        "torus-surface": "conic-gradient(from 0deg, #7C3AED, #6366F1, #A78BFA, #C4B5FD, #818CF8, #7C3AED)",
      },
      boxShadow: {
        "violet-glow":  "0 0 40px rgba(139,92,246,0.25), 0 0 80px rgba(99,102,241,0.12)",
        "violet-sm":    "0 0 16px rgba(139,92,246,0.2)",
        "card-dark":    "0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.04) inset",
        "pricing-pop":  "0 0 0 1px rgba(139,92,246,0.4), 0 8px 48px rgba(139,92,246,0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
