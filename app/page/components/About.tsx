"use client";

import Reveal from "@/shared/ui/Reveal";
import { profile } from "@/data/portfolio";
import AboutSkillsTicker from "@/app/page/components/AboutSkillsTicker";
import { usePublicCollection } from "@/feature/home/usePublicCollection";

type AboutEntry = {
  id: string;
  tag: string;
  title: string;
  desc: string;
  Lanuage: string;
};

export default function About() {
  const { items, error, loading } = usePublicCollection<AboutEntry>("/api/about");
  const skills = [...new Set(
    items
      .flatMap(({ Lanuage }) => Lanuage.split(","))
      .map((skill) => skill.trim())
      .filter(Boolean),
  )];

  return (
    <section id="about" className="mx-auto max-w-7xl px-5 py-24">
      <Reveal>
        <p className="text-sm uppercase tracking-widest text-neon">
          {items[0]?.tag || "About me"}
        </p>
        <h2 className="mt-2 text-3xl font-bold sm:text-5xl">
          A bit about <span className="text-gradient">me</span>
        </h2>
      </Reveal>

      {error ? (
        <Reveal delay={0.1}>
          <p role="status" className="mt-6 text-sm text-amber-100/70">
            Showing default About content because the saved content could not be loaded: {error}
          </p>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-white/70">{profile.about}</p>
        </Reveal>
      ) : loading ? (
        <p className="mt-6 text-sm text-white/50" role="status">Loading About content…</p>
      ) : items.length > 0 ? (
        <div className="mt-6 max-w-2xl space-y-6">
          {items.map((item, index) => (
            <Reveal key={item.id} delay={0.1 + index * 0.05}>
              <div>
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-lg leading-relaxed text-white/70">{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-lg text-white/60">About content is coming soon.</p>
      )}

      {error ? (
        <Reveal delay={0.2} className="mt-12 overflow-hidden">
          <AboutSkillsTicker skills={profile.skills} />
        </Reveal>
      ) : loading ? null : skills.length > 0 ? (
        <Reveal delay={0.2} className="mt-12 overflow-hidden">
          <AboutSkillsTicker skills={skills} />
        </Reveal>
      ) : null}
    </section>
  );
}
