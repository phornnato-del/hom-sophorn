"use client";

import ProjectCard from "@/shared/ui/ProjectCards";
import Reveal from "@/shared/ui/Reveal";
import { projects as defaultProjects, type Project } from "@/data/portfolio";
import { imageSrc } from "@/lib/imageSrc";
import { usePublicCollection } from "@/feature/home/usePublicCollection";

type ProjectEntry = {
  id: string;
  image: string | null;
  title: string;
  desc: string;
  technology: string;
  git_link: string | null;
  live_link: string | null;
};

export default function Projects() {
  const { items, error, loading } = usePublicCollection<ProjectEntry>("/api/project");
  const visibleProjects: Project[] = error
    ? defaultProjects
    : items.map((project) => ({
        title: project.title,
        description: project.desc,
        tags: project.technology.split(",").map((tag) => tag.trim()).filter(Boolean),
        image: project.image ? imageSrc(project.image) : undefined,
        github: project.git_link || undefined,
        live: project.live_link || undefined,
      }));

  return (
    <section id="projects" className="mx-auto max-w-7xl px-5 py-24">
      <Reveal>
        <p className="text-sm uppercase tracking-widest text-neon">Projects</p>
        <h2 className="mt-2 text-3xl font-bold sm:text-5xl">
          Things I&apos;ve <span className="text-gradient">built</span>
        </h2>
      </Reveal>

      {error && (
        <p role="status" className="mt-6 text-sm text-amber-100/70">
          Showing example projects because saved projects could not be loaded: {error}
        </p>
      )}
      {loading && <p className="mt-6 text-sm text-white/50" role="status">Loading projects…</p>}
      {!loading && !error && visibleProjects.length === 0 && (
        <p className="mt-6 text-white/60">Projects are being prepared.</p>
      )}

      {visibleProjects.length > 0 && (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProjects.map((project, index) => (
            <Reveal key={`${project.title}-${index}`} delay={index * 0.1}>
              <ProjectCard project={project} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
