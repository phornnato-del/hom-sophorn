import About from "@/app/page/components/About";
import Contact from "@/app/page/components/Contact";
import Hero from "@/app/page/components/Hero";
import Navbar from "@/app/page/components/Navbar";
import Projects from "@/app/page/components/Projects";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <About />
      <Projects />
      <Contact />
    </main>
  );
}