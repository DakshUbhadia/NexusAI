import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "Nexus AI | Collaborative Architecture Workspace",
  description:
    "Design systems together on a live canvas, generate architecture with AI, and turn decisions into build-ready technical specs.",
};

export default function HomePage() {
  return <LandingPage />;
}
