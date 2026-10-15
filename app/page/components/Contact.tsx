import { GitBranchIcon, LinkIcon, Mail, WorkflowIcon } from "lucide-react";
import Reveal from "../../../shared/ui/Reveal";
import { profile } from "@/data/portfolio";

export default function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-7xl px-5 py-24 text-center">
      <Reveal>
        <h2 className="text-3xl font-bold sm:text-5xl">
          Let&apos;s <span className="text-gradient">work together</span>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-white/70">
          Have an idea or want to say hi? My inbox is always open.
        </p>

        <a
          href={`mailto:${profile.email}`}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-grape px-8 py-3 font-semibold shadow-lg shadow-grape/40 transition hover:scale-105"
        >
          <Mail size={18} /> Say hello
        </a>

        <div className="mt-8 flex justify-center gap-5">
          <a href={profile.socials.github} target="_blank" rel="noreferrer"
             className="glass rounded-full p-3 transition hover:text-neon" aria-label="GitHub">
            <GitBranchIcon size={20} />
          </a>
          <a href={profile.socials.linkedin} target="_blank" rel="noreferrer"
             className="glass rounded-full p-3 transition hover:text-neon" aria-label="LinkedIn">
            <WorkflowIcon size={20} />
          </a>
        </div>
      </Reveal>

      <p className="mt-20 text-xs text-white/40">
        © 2026 {profile.name}. Built with Next.js.
      </p>
    </section>
  );
}