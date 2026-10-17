import Reveal from "../../../shared/ui/Reveal";
import { profile } from "@/data/portfolio";
import AboutSkillsTicker from "@/app/page/components/AboutSkillsTicker";

export default function About() {
  return (
    <section id="about" className="mx-auto max-w-7xl px-5 py-24">
      <Reveal>
        <p className="text-sm uppercase tracking-widest text-neon">About me</p>
        <h2 className="mt-2 text-3xl font-bold sm:text-5xl">
          A bit about <span className="text-gradient">me</span>
        </h2>
      </Reveal>

      <Reveal delay={0.1}>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
          {profile.about}
        </p>
      </Reveal>

      <Reveal delay={0.2} className="mt-12 overflow-hidden">
        <AboutSkillsTicker />
      </Reveal>
    </section>
  );
}