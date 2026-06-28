import Footer from "@/components/landing/layout/Footer";
import Navbar from "@/components/landing/layout/Navbar";
import FeaturesSection from "./sections/FeaturesSection";
import HeroSection from "./sections/HeroSection";
import HowItWorksSection from "./sections/HowItWorksSection";
import { StaggeredGrid } from "@/components/ui/staggered-grid";
import { Users, Zap } from "lucide-react";
import { FaGithub, FaLinkedin, FaEnvelope } from "react-icons/fa";
import { 
  SiNextdotjs, SiReact, SiTailwindcss, SiVercel, SiPostgresql, 
  SiClerk, SiTypescript, SiGreensock, SiPrisma, SiFramer, 
  SiShadcnui, SiThreedotjs, SiRadixui
} from "react-icons/si";

const techStackNodes = [
  { label: "Next.js 16", icon: <SiNextdotjs size={24} /> },
  { label: "React Flow", icon: <SiReact size={24} /> },
  { label: "Liveblocks", icon: <Users size={24} /> },
  { label: "Tailwind CSS", icon: <SiTailwindcss size={24} /> },
  { label: "Trigger.dev", icon: <Zap size={24} /> },
  { label: "Vercel Blob", icon: <SiVercel size={24} /> },
  { label: "PostgreSQL", icon: <SiPostgresql size={24} /> },
  { label: "Clerk Auth", icon: <SiClerk size={24} /> },
  { label: "TypeScript", icon: <SiTypescript size={24} /> },
  { label: "GSAP", icon: <SiGreensock size={24} /> },
  { label: "Prisma ORM", icon: <SiPrisma size={24} /> },
  { label: "Framer Motion", icon: <SiFramer size={24} /> },
  { label: "ShadCN", icon: <SiShadcnui size={24} /> },
  { label: "Three.js", icon: <SiThreedotjs size={24} /> },
  { label: "Radix UI", icon: <SiRadixui size={24} /> },
];

const bentoItems = [
  {
    id: 1,
    title: "GitHub Repository",
    subtitle: "Source Code",
    description: "Explore the open-source code for Nexus AI",
    icon: <FaGithub className="w-8 h-8" />,
    href: "https://github.com/DakshUbhadia/NexusAI",
    image: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 2,
    title: "Connect",
    subtitle: "LinkedIn",
    description: "Let's connect on LinkedIn",
    icon: <FaLinkedin className="w-8 h-8" />,
    href: "https://www.linkedin.com/in/daksh-ubhadia-2510b72a7/",
    image: "https://images.unsplash.com/photo-1578574577315-3fbeb0cecdc2?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 3,
    title: "Contact",
    subtitle: "Email Me",
    description: "Reach out via Gmail",
    icon: <FaEnvelope className="w-8 h-8" />,
    href: "mailto:ubhadiadaksh@gmail.com",
    image: "https://images.unsplash.com/photo-1596526131083-e8c633c948d2?q=80&w=600&auto=format&fit=crop"
  }
];

export function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <StaggeredGrid 
          nodes={techStackNodes} 
          bentoItems={bentoItems} 
          centerText="NEXUS AI" 
          showFooter={false}
        />
      </main>
      <Footer />
    </>
  );
}