"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import EncryptedImage from "@/shared/ui/EncryptedImage";
import { ArrowDown, ArrowUpRight, GitBranchPlusIcon, Sparkles, UserRound } from "lucide-react";
import { profile } from "@/data/portfolio";
import { imageSrc } from "@/lib/imageSrc";
import { usePublicCollection } from "@/feature/home/usePublicCollection";

type Banner = {
  id: string;
  name: string;
  tag: string;
  title: string;
  slogan: string | null;
  desc: string | null;
  link: string;
  image: string;
};

function getBannerHref(link?: string) {
  if (!link) return "#projects";
  if (link.startsWith("/") && !link.startsWith("//")) return link;
  if (link.startsWith("#")) return link;
  try {
    const url = new URL(link);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "#projects";
  } catch {
    return "#projects";
  }
}

function isGitHubLink(link: string) {
  try {
    const hostname = new URL(link).hostname.toLowerCase();
    return hostname === "github.com" || hostname.endsWith(".github.com");
  } catch {
    return false;
  }
}

export default function Hero() {
  const [i, setI] = useState(0);
  const { items: banners, error } = usePublicCollection<Banner>("/api/banner");
  const banner = banners[0];
  const bannerHref = getBannerHref(banner?.link);
  const bannerLinksToGitHub = isGitHubLink(bannerHref);
  const bannerRoles = (banner?.slogan ?? "")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
  const roles = bannerRoles?.length ? bannerRoles : profile.roles;

  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % roles.length), 2400);
    return () => clearInterval(t);
  }, [roles.length]);

  return (
    <section className="relative flex min-h-[min(900px,100svh)] items-center overflow-hidden px-5 pb-16 pt-28 sm:px-8">
      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
        <div className="max-w-2xl">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs text-lilac sm:text-sm"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.7)]" />
          {banner?.tag || "Available for select projects"}
        </motion.p>
        {error && (
          <p role="status" className="mb-4 text-xs text-amber-100/70">
            Showing default hero content: {error}
          </p>
        )}

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
          className="text-5xl font-extrabold leading-[1.04] sm:text-6xl lg:text-7xl"
        >
          {banner?.title ?? <>Designing and building <span className="text-gradient">digital things</span></>}
        </motion.h1>

        <div className="mt-5 h-9 text-lg font-medium text-lilac sm:text-2xl">
          <AnimatePresence mode="wait">
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="inline-block"
            >
              {roles[i % roles.length]}
            </motion.span>
          </AnimatePresence>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-5 max-w-xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8"
        >
          I&apos;m <span className="font-semibold text-white">{profile.name}</span>. {banner?.desc || profile.intro}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 flex flex-col items-start gap-3 sm:flex-row"
        >
          <a
            href={bannerHref}
            target={bannerHref.startsWith("http") ? "_blank" : undefined}
            rel={bannerHref.startsWith("http") ? "noreferrer" : undefined}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-400 px-7 py-3 font-semibold text-white shadow-lg shadow-violet-950/50 transition hover:-translate-y-0.5 hover:shadow-violet-500/25"
          >
            {bannerLinksToGitHub ? (
              <>Visit my GitHub <GitBranchPlusIcon size={18} /></>
            ) : (
              <>Explore my work <ArrowDown size={18} /></>
            )}
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7 }}
          className="mt-10 flex items-center gap-4 text-sm text-white/50"
        >
          <span className="h-px w-10 bg-lilac/40" />
          Scroll to explore
        </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, x: 18 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
          className="relative mx-auto w-full max-w-[430px] lg:ml-auto"
        >
          <div className="glass relative aspect-[4/5] overflow-hidden rounded-[2rem] p-3">
            <div className="relative flex h-full items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(145deg,rgba(159,116,235,0.25),rgba(31,20,49,0.8)_58%,rgba(230,166,255,0.12))]">
              {banner?.image || profile.image ? (
                <EncryptedImage
                  src={imageSrc(banner?.image || profile.image)}
                  alt={banner?.name || `${profile.name} portrait`}
                  fill
                  unoptimized
                  sizes="(max-width: 1024px) 80vw, 430px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex flex-col items-center gap-5 text-center text-lilac/70">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/20 bg-white/[0.07] shadow-[0_0_70px_rgba(165,125,255,0.2)]">
                    <UserRound size={54} strokeWidth={1} />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]">Your portrait</span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#100a1d]/80 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-lilac/80">{banner?.name || "Portfolio · 2026"}</p>
                  <p className="mt-1 text-2xl font-semibold">{profile.name}</p>
                </div>
                <Sparkles className="mb-1 text-neon" size={21} />
              </div>
            </div>
          </div>

          <div className="glass absolute -bottom-5 -left-5 flex items-center gap-3 rounded-2xl px-4 py-3 sm:-left-10">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400/15 text-lilac">
              <Sparkles size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold">Thoughtful by design</p>
              <p className="text-xs text-white/50">From idea to interface</p>
            </div>
          </div>

          <a
            href="#about"
            aria-label="Learn more about me"
            className="glass absolute -right-3 top-8 flex h-12 w-12 items-center justify-center rounded-full text-lilac transition hover:-translate-y-1 hover:text-white sm:-right-5"
          >
            <ArrowUpRight size={20} />
          </a>
        </motion.div>
      </div>
    </section>
  );
}