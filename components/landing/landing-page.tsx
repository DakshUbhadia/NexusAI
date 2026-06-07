import Footer from "@/components/landing/layout/Footer";
import Navbar from "@/components/landing/layout/Navbar";
import HeroSection from "./sections/HeroSection";

export function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
      </main>
      <Footer />
    </>
  );
}