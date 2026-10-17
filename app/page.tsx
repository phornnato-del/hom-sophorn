import About from "@/app/page/components/About";
import Contact from "@/app/page/components/Contact";
import Hero from "@/app/page/components/Hero";
import Navbar from "@/app/page/components/Navbar";
import Projects from "@/app/page/components/Projects";
import HomeIntroExperience from "@/feature/home/HomeIntroExperience";

export default function Home() {
  return (
    <HomeIntroExperience>
      <main className="relative z-10">
        <Navbar />
        <Hero />
        <About />
        <Projects />
        <Contact />
      </main>
    </HomeIntroExperience>
  );
}