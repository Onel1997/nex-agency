import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { WhyNexAgency } from "@/components/WhyNexAgency";
import { Portfolio } from "@/components/Portfolio";
import { Process } from "@/components/Process";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";

function SectionDivider() {
  return (
    <div className="section-inner px-6 sm:px-8">
      <div className="section-divider" />
    </div>
  );
}

export default function Home() {
  return (
    <main className="relative overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 aurora opacity-80" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(34,211,238,0.05)_0%,_transparent_50%)]" />

      <Navbar />
      <Hero />
      <SectionDivider />
      <Services />
      <SectionDivider />
      <WhyNexAgency />
      <SectionDivider />
      <Portfolio />
      <SectionDivider />
      <Process />
      <CTASection />
      <Footer />
    </main>
  );
}
