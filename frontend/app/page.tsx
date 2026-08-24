import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Programs from "@/components/Programs";
import Benefits from "@/components/Benefits";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="overflow-hidden bg-[#061827]">
      <Navbar />
      <Hero />
      <About />
      <Programs />
      <Benefits />
      <CTA />
      <Footer />
    </main>
  );
}
