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
import { AnimatedSectionDivider } from "@/components/motion/SectionDivider";

export default function Home() {
  return (
    <main className="page-flow relative overflow-visible">
      <div className="page-ambient aurora aurora--page" aria-hidden />
      <div
        className="page-ambient bg-[radial-gradient(ellipse_at_bottom_left,_rgba(34,211,238,0.025)_0%,_transparent_52%)]"
        aria-hidden
      />

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
    </main>
  );
}
