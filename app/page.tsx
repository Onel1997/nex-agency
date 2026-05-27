import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { StatsSection } from "@/components/StatsSection";
import { Services } from "@/components/Services";
import { WhyNexAgency } from "@/components/WhyNexAgency";
import { Portfolio } from "@/components/Portfolio";
import { Process } from "@/components/Process";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";
import { AnimatedSectionDivider } from "@/components/motion/SectionDivider";

export default function Home() {
  return (
    <main className="relative overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 aurora opacity-70" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(34,211,238,0.04)_0%,_transparent_50%)]" />

      <Navbar />
      <Hero />
      <StatsSection />
      <AnimatedSectionDivider />
      <Services />
      <AnimatedSectionDivider />
      <WhyNexAgency />
      <AnimatedSectionDivider />
      <Portfolio />
      <AnimatedSectionDivider />
      <Process />
      <AnimatedSectionDivider />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </main>
  );
}
