"use client";
import EncryptedImage from "@/shared/ui/EncryptedImage";
import { motion } from "framer-motion";
import { ExternalLink, GitBranchIcon, ImageIcon } from "lucide-react";
import type { Project } from "@/data/portfolio";

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <motion.article
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="glass group relative flex h-full flex-col overflow-hidden rounded-xl p-6 transition-colors hover:border-lilac/30"
    >
      <div className="relative -mx-6 -mt-6 mb-5 aspect-16/10 overflow-hidden border-b border-white/10 bg-[linear-gradient(145deg,rgba(145,96,220,0.24),rgba(24,17,38,0.95)_68%,rgba(230,166,255,0.12))]">
        {project.image ? (
          <EncryptedImage
            src={project.image}
            alt={`${project.title} project screenshot`}
            fill
            unoptimized
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-lilac/70">
            <ImageIcon size={25} strokeWidth={1.4} />
            <span className="text-[10px] font-medium uppercase tracking-[0.18em]">
              Add project screenshot
            </span>
          </div>
        )}
      </div>
      <div className="relative mb-5 h-px w-12 bg-linear-to-r from-lilac to-transparent transition-all group-hover:w-20" />
      <h3 className="relative text-xl font-bold">{project.title}</h3>
      <p className="relative mt-3 flex-1 text-sm leading-relaxed text-white/70">
        {project.description}
      </p>

      <div className="relative mt-5 flex flex-wrap gap-2">
        {project.tags.map((t) => (
          <span
            key={t}
            className="rounded-full bg-white/10 px-3 py-1 text-xs text-lilac"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="relative mt-6 flex gap-4 text-sm">
        {project.github && (
          <a
            href={project.github}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 transition hover:text-neon"
          >
            <GitBranchIcon size={16} /> Code
          </a>
        )}
        {project.live && (
          <a
            href={project.live}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 transition hover:text-neon"
          >
            <ExternalLink size={16} /> Live
          </a>
        )}
      </div>
    </motion.article>
  );
}