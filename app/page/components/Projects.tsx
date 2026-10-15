import ProjectCard from "../../../shared/ui/ProjectCards";
import Reveal from "../../../shared/ui/Reveal";
import { projects } from "@/data/portfolio";

export default function Projects() {
  return (
    <section id="projects" className="mx-auto max-w-7xl px-5 py-24">
      <Reveal>
        <p className="text-sm uppercase tracking-widest text-neon">Projects</p>
        <h2 className="mt-2 text-3xl font-bold sm:text-5xl">
          Things I&apos;ve <span className="text-gradient">built</span>
        </h2>
      </Reveal>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.1}>
            <ProjectCard project={p} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}