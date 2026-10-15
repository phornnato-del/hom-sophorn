import Image from "next/image";
import { UserRound } from "lucide-react";
import Reveal from "../../../shared/ui/Reveal";
import { profile } from "@/data/portfolio";

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
        <div className="flex w-max animate-marquee gap-3">
          {[0, 1].map((set) => (
            <div key={set} className="flex shrink-0 items-center gap-3">
              {profile.skills.map((skill, idx) => (
                <span
                  key={`${set}-${idx}`}
                  className="glass whitespace-nowrap rounded-full px-5 py-2 text-sm text-lilac"
                >
                  {skill}
                </span>
              ))}
              <span
                className="glass relative flex h-10 w-17 shrink-0 items-center justify-center overflow-hidden rounded-full text-lilac"
                aria-label={profile.image ? `${profile.name} portrait` : "Portrait image placeholder"}
                title={profile.image ? profile.name : "Set profile.image to show your photo"}
              >
                {profile.image ? (
                  <Image
                    src={profile.image}
                    alt={`${profile.name} portrait`}
                    fill
                    sizes="68px"
                    className="object-cover"
                  />
                ) : (
                  <UserRound size={19} strokeWidth={1.5} />
                )}
              </span>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}