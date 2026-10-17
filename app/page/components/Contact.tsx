"use client";

import { GitBranchIcon, LinkIcon, Mail, WorkflowIcon } from "lucide-react";
import Reveal from "@/shared/ui/Reveal";
import { profile } from "@/data/portfolio";
import { usePublicCollection } from "@/feature/home/usePublicCollection";

type ContactEntry = {
  id: string;
  type: string;
  link: string;
};

function safeContactHref(contact: ContactEntry) {
  const value = contact.link.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  if (contact.type.toLowerCase().includes("phone")) {
    const phone = value.replace(/[^\d+]/g, "");
    return phone ? `tel:${phone}` : null;
  }
  if (value.startsWith("/") && !value.startsWith("//")) return value;

  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function ContactIcon({ type }: { type: string }) {
  const normalized = type.toLowerCase();
  if (normalized.includes("email") || normalized.includes("mail")) return <Mail size={20} />;
  if (normalized.includes("github")) return <GitBranchIcon size={20} />;
  if (normalized.includes("linkedin")) return <WorkflowIcon size={20} />;
  return <LinkIcon size={20} />;
}

export default function Contact() {
  const { items, error } = usePublicCollection<ContactEntry>("/api/contact");
  const email = items.find((contact) =>
    contact.type.toLowerCase().includes("email") ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.link),
  );
  const contacts = error
    ? [
        { id: "github", type: "GitHub", link: profile.socials.github },
        { id: "linkedin", type: "LinkedIn", link: profile.socials.linkedin },
      ]
    : items;

  return (
    <section id="contact" className="mx-auto max-w-7xl px-5 py-24 text-center">
      <Reveal>
        <h2 className="text-3xl font-bold sm:text-5xl">
          Let&apos;s <span className="text-gradient">work together</span>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-white/70">
          Have an idea or want to say hi? My inbox is always open.
        </p>

        {error && (
          <p role="status" className="mt-4 text-sm text-amber-100/70">
            Showing default contact links because saved links could not be loaded: {error}
          </p>
        )}

        {email && !error ? (
          <a
            href={safeContactHref(email) ?? `mailto:${profile.email}`}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-grape px-8 py-3 font-semibold shadow-lg shadow-grape/40 transition hover:scale-105"
          >
            <Mail size={18} /> Say hello
          </a>
        ) : error ? (
          <a
            href={`mailto:${profile.email}`}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-grape px-8 py-3 font-semibold shadow-lg shadow-grape/40 transition hover:scale-105"
          >
            <Mail size={18} /> Say hello
          </a>
        ) : null}

        <div className="mt-8 flex flex-wrap justify-center gap-5">
          {contacts.map((contact) => {
            const href = safeContactHref(contact);
            return href ? (
              <a
                key={contact.id}
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noreferrer" : undefined}
                className="glass inline-flex items-center gap-2 rounded-full px-4 py-3 transition hover:text-neon"
                aria-label={contact.type}
              >
                <ContactIcon type={contact.type} />
                <span>{contact.type}</span>
              </a>
            ) : null;
          })}
        </div>
        {!error && items.length === 0 && (
          <p className="mt-4 text-sm text-white/50">Contact links are being updated.</p>
        )}
      </Reveal>

      <p className="mt-20 text-xs text-white/40">
        © 2026 {profile.name}. Built with Next.js.
      </p>
    </section>
  );
}
