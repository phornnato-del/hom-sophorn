"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlignLeft,
  AtSign,
  ChevronLeft,
  CircleUserRound,
  FolderKanban,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  PanelTop,
  Settings2,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { profile } from "@/data/portfolio";

const navigation = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Admin", href: "/admin/admin", icon: CircleUserRound },
  { label: "Hero", href: "/admin/hero", icon: PanelTop },
  { label: "About me", href: "/admin/about", icon: AlignLeft },
  { label: "Projects", href: "/admin/projects", icon: FolderKanban },
  { label: "Contact me", href: "/admin/contact", icon: MessageSquareText },
  { label: "Settings", href: "/admin/settings", icon: Settings2 },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const currentPage = navigation.find((item) => item.href === pathname) ?? navigation[0];

  return (
    <div className="min-h-screen text-white">
      {mobileNavOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-white/8 bg-[#100a1d]/95 px-4 py-5 backdrop-blur-2xl transition-transform md:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-2">
          <Link href="/admin" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-violet-400 to-fuchsia-400 text-sm font-bold text-[#170d28]">
              HS
            </span>
            <span>
              <span className="block text-sm font-semibold">Studio Panel</span>
              <span className="mt-0.5 block text-xs text-white/40">Portfolio admin</span>
            </span>
          </Link>
          <button
            type="button"
            className="rounded-lg p-2 text-white/50 hover:bg-white/8 hover:text-white md:hidden"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-10 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
          Workspace
        </div>
        <nav aria-label="Admin modules" className="mt-3 flex-1 space-y-1">
          {navigation.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileNavOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-violet-300/12 font-medium text-lilac shadow-[inset_2px_0_0_#c4b5fd]"
                    : "text-white/55 hover:bg-white/5 hover:text-white/90"
                }`}
              >
                <Icon size={17} strokeWidth={1.8} />
                {label}
                {active && <ChevronLeft className="ml-auto rotate-180 text-lilac/60" size={15} />}
              </Link>
            );
          })}
        </nav>

        <div className="glass rounded-2xl p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-300/15 text-xs font-semibold text-lilac">
              HS
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{profile.name}</p>
              <p className="mt-0.5 truncate text-xs text-white/40">Workspace owner</p>
            </div>
            <AtSign className="text-white/35" size={15} />
          </div>
        </div>
      </aside>

      <div className="min-h-screen md:pl-[272px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-white/8 bg-[#100a1d]/75 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              className="rounded-lg p-2 text-white/65 hover:bg-white/8 hover:text-white md:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu size={19} />
            </button>
            <div>
              <p className="text-sm font-semibold">{currentPage.label}</p>
              <p className="mt-0.5 hidden text-xs text-white/40 sm:block">Manage your portfolio workspace</p>
            </div>
          </div>
          <Link
            href="/"
            target="_blank"
            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/65 transition hover:border-lilac/30 hover:text-white"
          >
            View portfolio
          </Link>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}