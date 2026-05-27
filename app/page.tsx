import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { StatsSection } from "@/components/StatsSection";
import { Services } from "@/components/Services";
import { WhyNexAgency } from "@/components/WhyNexAgency";
import { TrustedTechnologies } from "@/components/TrustedTechnologies";
import { Portfolio } from "@/components/Portfolio";
import { TrustProofSection } from "@/components/TrustProofSection";
import { Process } from "@/components/Process";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";
import { MobileContactBar } from "@/components/MobileContactBar";
import { StickyContactCTA } from "@/components/StickyContactCTA";
import { AnimatedSectionDivider } from "@/components/motion/SectionDivider";

export default function Home() {
  return (
    <main className="page-flow relative overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 aurora aurora--page" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(34,211,238,0.025)_0%,_transparent_52%)]" />

      <Navbar />
      <Hero />
      <StatsSection />
      <AnimatedSectionDivider />
      <Services />
      <AnimatedSectionDivider />
      <WhyNexAgency />
      <AnimatedSectionDivider />
      <TrustedTechnologies />
      <AnimatedSectionDivider />
      <Portfolio />
      <AnimatedSectionDivider />
      <TrustProofSection />
      <AnimatedSectionDivider />
      <Process />
      <AnimatedSectionDivider />
      <CTASection />
      <Footer />
      <MobileContactBar />
      <StickyContactCTA />
    </main>
  );
}
