"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import EncryptedImage from "@/shared/ui/EncryptedImage";
import { usePathname, useRouter } from "next/navigation";
import {
  AlignLeft,
  ChevronLeft,
  CircleUserRound,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  PanelTop,
  Settings2,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { profile } from "@/data/portfolio";
import { getApi } from "@/lib/api-service";
import { encryptedFetch } from "@/lib/encrypted-fetch";

const navigation = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Admin", href: "/admin/admin", icon: CircleUserRound },
  { label: "Hero", href: "/admin/hero", icon: PanelTop },
  { label: "About me", href: "/admin/about", icon: AlignLeft },
  { label: "Projects", href: "/admin/projects", icon: FolderKanban },
  { label: "Tasks", href: "/admin/tasks", icon: ClipboardList },
  { label: "Contact me", href: "/admin/contact", icon: MessageSquareText },
  { label: "Settings", href: "/admin/settings", icon: Settings2 },
];

type AdminProfile = {
  name: string | null;
  imageUrl: string | null;
};

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const currentPage = navigation.find((item) => item.href === pathname) ?? navigation[0];

  async function handleLogout() {
    setIsLoggingOut(true);
    setLogoutError("");

    try {
      const response = await encryptedFetch("/api/admin/login", { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Unable to sign out. Please try again.");
      }

      router.replace("/admin/login");
      router.refresh();
    } catch (error: unknown) {
      console.error("Unable to sign out", error);
      setLogoutError(
        error instanceof Error ? error.message : "Unable to sign out. Please try again.",
      );
      setIsLoggingOut(false);
    }
  }

  useEffect(() => {
    getApi<AdminProfile>("/api/admin/me")
      .then(setAdminProfile)
      .catch((error: unknown) => {
        console.error("Unable to load signed-in admin profile", error);
      });
  }, []);

  const displayName = adminProfile?.name?.trim() || profile.name;
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

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
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-violet-400 to-fuchsia-400 text-sm font-bold text-[#170d28]">
              {adminProfile?.imageUrl ? (
                <EncryptedImage
                  src={adminProfile.imageUrl}
                  alt={`${displayName} profile photo`}
                  fill
                  unoptimized
                  sizes="40px"
                  className="object-cover"
                />
              ) : (
                initials
              )}
            </span>
            <span>
              <span className="block text-sm font-semibold">{displayName}</span>
              <span className="mt-0.5 block text-xs text-white/40">Admin Shell</span>
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
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-300/15 text-xs font-semibold text-lilac">
              {adminProfile?.imageUrl ? (
                <EncryptedImage
                  src={adminProfile.imageUrl}
                  alt={`${displayName} profile photo`}
                  fill
                  unoptimized
                  sizes="36px"
                  className="object-cover"
                />
              ) : (
                initials
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="mt-0.5 truncate text-xs text-white/40">Workspace owner</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/65 transition hover:border-red-300/25 hover:bg-red-400/8 hover:text-red-200 disabled:cursor-wait disabled:opacity-50"
          >
            <LogOut size={16} />
            {isLoggingOut ? "Signing out..." : "Log out"}
          </button>
          {logoutError && (
            <p role="alert" className="mt-2 text-xs text-red-300">
              {logoutError}
            </p>
          )}
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