"use client";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { profile } from "@/data/portfolio";

const links = [
  { href: "#about", label: "About" },
  { href: "#projects", label: "Projects" },
  { href: "#contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav className="glass mx-auto mt-3 flex w-[92%] max-w-7xl items-center justify-between rounded-full px-5 py-3">
        <a href="#" className="font-bold tracking-tight">
          {profile.name}
          <span className="text-neon">.</span>
        </a>

        <ul className="hidden gap-8 text-sm text-white/80 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="transition hover:text-neon">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <button
          className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside
        id="mobile-navigation"
        className={`glass fixed inset-y-0 right-0 z-[60] flex w-[min(85vw,22rem)] flex-col rounded-l-3xl p-6 transition-transform duration-300 ease-out md:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="mb-12 flex items-center justify-between">
          <a href="#" className="font-bold tracking-tight" onClick={() => setOpen(false)}>
            {profile.name}
            <span className="text-neon">.</span>
          </a>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="rounded-full p-2 transition hover:bg-white/10"
          >
            <X size={22} />
          </button>
        </div>

        <ul className="flex flex-col gap-7 text-lg text-white/85">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="block transition hover:text-neon"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </aside>
    </header>
  );
}