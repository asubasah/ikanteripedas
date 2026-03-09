import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { SegmentsSection } from "@/components/SegmentsSection";
import { ServicesSection } from "@/components/ServicesSection";
import { ReasonsSection } from "@/components/ReasonsSection";
import { WorkflowSection } from "@/components/WorkflowSection";
import { UseCasesSection } from "@/components/UseCasesSection";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-charcoal pb-16 text-text-light">
      <Header />
      <main className="mt-6 space-y-8">
        <Hero />
        <SegmentsSection />
        <ServicesSection />
        <ReasonsSection />
        <WorkflowSection />
        <UseCasesSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
