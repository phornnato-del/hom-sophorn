"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  CheckCircle2,
  Check,
  CircleAlert,
  CircleHelp,
  ClipboardList,
  Eye,
  FileText,
  FolderKanban,
  Globe2,
  ImagePlus,
  Mail,
  RefreshCw,
  Save,
  Users,
} from "lucide-react";
import { profile } from "@/data/portfolio";
import CollectionManager from "@/feature/admin/components/CollectionManager";
import TaskManager from "@/feature/admin/components/TaskManager";
import { getApi } from "@/lib/api-service";
import { imageSrc } from "@/lib/imageSrc";

type DashboardData = {
  counts: {
    projects: number;
    about: number;
    banners: number;
    contacts: number;
    admins: number;
    tasks: number;
  };
  recentProjects: {
    id: string;
    title: string;
    technology: string;
    image: string;
    createdAt: string;
  }[];
  generatedAt: string;
};

type ModuleKey = "dashboard" | "admin" | "hero" | "about" | "projects" | "tasks" | "contact" | "settings";
type FieldSpec = { key: string; label: string; hint?: string; multiline?: boolean; type?: string };

function subscribeToStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getLastSavedSnapshot() {
  const savedAt = window.localStorage.getItem("portfolio-admin-last-saved");
  return savedAt ? new Date(savedAt).toLocaleString() : "Not published";
}

const moduleDetails: Record<Exclude<ModuleKey, "dashboard" | "projects" | "tasks">, {
  eyebrow: string;
  title: string;
  description: string;
  fields: FieldSpec[];
}> = {
  admin: {
    eyebrow: "Workspace profile",
    title: "Admin profile",
    description: "Manage the profile details used across your portfolio workspace.",
    fields: [
      { key: "name", label: "Display name" },
      { key: "email", label: "Email address", type: "email" },
      { key: "role", label: "Role" },
    ],
  },
  hero: {
    eyebrow: "Homepage content",
    title: "Hero section",
    description: "Shape the first impression visitors see when they land on your portfolio.",
    fields: [
      { key: "headline", label: "Headline" },
      { key: "intro", label: "Intro paragraph", multiline: true },
      { key: "roles", label: "Rotating roles", hint: "Separate each role with a comma." },
      { key: "image", label: "Portrait image path", hint: "Use an image inside public, for example /portrait.jpg." },
    ],
  },
  about: {
    eyebrow: "Homepage content",
    title: "About me",
    description: "Update your introduction and the skills shown in the scrolling strip.",
    fields: [
      { key: "about", label: "Biography", multiline: true },
      { key: "skills", label: "Skills", hint: "Separate each skill with a comma.", multiline: true },
    ],
  },
  contact: {
    eyebrow: "Homepage content",
    title: "Contact details",
    description: "Keep your contact address and social links up to date.",
    fields: [
      { key: "email", label: "Public email", type: "email" },
      { key: "github", label: "GitHub URL", type: "url" },
      { key: "linkedin", label: "LinkedIn URL", type: "url" },
    ],
  },
  settings: {
    eyebrow: "Workspace preferences",
    title: "Settings",
    description: "Review site identity and publishing preferences for this workspace.",
    fields: [
      { key: "siteTitle", label: "Site title" },
      { key: "description", label: "Search description", multiline: true },
      { key: "visibility", label: "Site visibility", hint: "This preference is a draft until publishing is connected." },
    ],
  },
};

const moduleDefaults: Record<Exclude<ModuleKey, "dashboard" | "projects" | "tasks">, Record<string, string>> = {
  admin: { name: profile.name, email: profile.email, role: profile.roles[0] ?? "Administrator" },
  hero: {
    headline: "Designing and building digital things",
    intro: profile.intro,
    roles: profile.roles.join(", "),
    image: profile.image,
  },
  about: { about: profile.about, skills: profile.skills.join(", ") },
  contact: {
    email: profile.email,
    github: profile.socials.github,
    linkedin: profile.socials.linkedin,
  },
  settings: {
    siteTitle: `${profile.name} | Creative Developer`,
    description: "Selected work and digital experiences by Hom Sophorn, a creative developer.",
    visibility: "Public",
  },
};

const moduleRoutes = [
  { label: "Admin users", href: "/admin/admin", icon: Users },
  { label: "Hero", href: "/admin/hero", icon: ImagePlus },
  { label: "About me", href: "/admin/about", icon: FileText },
  { label: "Projects", href: "/admin/projects", icon: FolderKanban },
  { label: "Tasks", href: "/admin/tasks", icon: ClipboardList },
  { label: "Contact me", href: "/admin/contact", icon: Mail },
];

export default function AdminContent({ moduleKey }: { moduleKey: ModuleKey }) {
  if (moduleKey === "dashboard") return <DashboardOverview />;
  if (moduleKey === "tasks") return <TaskManager />;
  if (moduleKey !== "settings") {
    return <CollectionManager key={moduleKey} collection={moduleKey} />;
  }
  return <ModuleEditor moduleKey={moduleKey} />;
}

function DashboardOverview() {
  const lastSaved = useSyncExternalStore(
    subscribeToStorage,
    getLastSavedSnapshot,
    () => "Not published",
  );
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardError, setDashboardError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    getApi<DashboardData>("/api/admin/dashboard")
      .then((data) => {
        if (!controller.signal.aborted) {
          setDashboard(data);
          setDashboardError("");
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setDashboardError(
            error instanceof Error ? error.message : "Unable to load dashboard.",
          );
        }
      });

    return () => controller.abort();
  }, [refreshCount]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <PageHeading
          eyebrow="Workspace overview"
          title={`Welcome back, ${profile.name.split(" ")[0]}`}
          description="Your portfolio workspace at a glance. Pick up where you left off."
          badge="Live overview"
        />
        <button
          type="button"
          onClick={() => setRefreshCount((current) => current + 1)}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/65 transition hover:border-lilac/30 hover:text-white disabled:opacity-40"
        >
          <RefreshCw size={14} /> Refresh overview
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Projects" value={dashboard ? String(dashboard.counts.projects) : "—"} note="Saved in database" icon={FolderKanban} tone="violet" />
        <StatCard label="About entries" value={dashboard ? String(dashboard.counts.about) : "—"} note="Content records" icon={FileText} tone="cyan" />
        <StatCard label="Hero banners" value={dashboard ? String(dashboard.counts.banners) : "—"} note="Homepage banners" icon={ImagePlus} tone="pink" />
        <StatCard label="Contact links" value={dashboard ? String(dashboard.counts.contacts) : "—"} note="Published contact methods" icon={Mail} tone="green" />
        <Link href="/admin/tasks" className="rounded-2xl transition hover:-translate-y-0.5">
          <StatCard label="Tasks" value={dashboard ? String(dashboard.counts.tasks) : "—"} note="Open task manager" icon={ClipboardList} tone="violet" />
        </Link>
      </div>

      {dashboardError && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200/15 bg-rose-300/5 px-4 py-3 text-sm text-rose-100 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2"><CircleAlert size={16} /> {dashboardError}</span>
          <button type="button" onClick={() => setRefreshCount((current) => current + 1)} className="font-medium text-white underline decoration-white/30 underline-offset-4">Try again</button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <section className="glass overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-sm font-semibold">Recent projects</h2>
              <p className="mt-1 text-xs text-white/40">Latest projects saved to your portfolio</p>
            </div>
            <Link href="/admin/projects" className="inline-flex items-center gap-1 text-xs font-medium text-lilac hover:text-white">
              Manage <ArrowUpRight size={14} />
            </Link>
          </div>
          {!dashboard && !dashboardError ? (
            <div role="status" className="space-y-3 p-5 sm:p-6">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex animate-pulse items-center gap-4">
                  <span className="h-12 w-16 rounded-lg bg-white/8" />
                  <span className="flex-1 space-y-2">
                    <span className="block h-3 w-2/5 rounded bg-white/8" />
                    <span className="block h-2.5 w-3/5 rounded bg-white/5" />
                  </span>
                </div>
              ))}
            </div>
          ) : dashboard?.recentProjects.length ? (
            <div className="divide-y divide-white/6">
              {dashboard.recentProjects.map((project) => (
                <div key={project.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                  <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                    <Image src={imageSrc(project.image)} alt="" fill unoptimized sizes="64px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{project.title}</p>
                    <p className="mt-1 truncate text-xs text-white/40">{project.technology}</p>
                  </div>
                  <time className="hidden shrink-0 text-xs text-white/35 sm:block" dateTime={project.createdAt}>
                    {new Date(project.createdAt).toLocaleDateString()}
                  </time>
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-200/70" aria-label="Saved" />
                </div>
              ))}
            </div>
          ) : (
            <p className="px-5 py-8 text-sm text-white/45 sm:px-6">
              {dashboardError ? "Recent projects are unavailable." : "No projects yet. Add your first project to get started."}
            </p>
          )}
        </section>

        <section className="glass rounded-2xl p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-lilac/75">Site status</p>
              <h2 className="mt-3 text-xl font-semibold">Workspace status</h2>
            </div>
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              dashboardError
                ? "bg-rose-300/10 text-rose-200"
                : dashboard
                  ? "bg-emerald-300/10 text-emerald-200"
                  : "bg-amber-200/10 text-amber-100"
            }`}>
              {dashboardError
                ? <CircleAlert size={19} />
                : dashboard
                  ? <Globe2 size={19} />
                  : <RefreshCw size={19} className="animate-spin" />}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/50">
            {dashboardError
              ? "The dashboard could not retrieve the latest workspace data."
              : dashboard
                ? `Connected to the portfolio database. ${dashboard.counts.admins} admin account${dashboard.counts.admins === 1 ? "" : "s"} available.`
                : "Loading live content and database status..."}
          </p>
          <Link href="/" target="_blank" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-lilac transition hover:text-white">
            <Eye size={16} /> Preview site <ArrowUpRight size={14} />
          </Link>
          <div className="mt-6 border-t border-white/8 pt-5">
            <p className="text-xs font-medium text-white/50">Manage workspace</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {moduleRoutes.map(({ label, href, icon: Icon }) => (
                <Link key={href} href={href} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/65 transition hover:border-lilac/30 hover:text-white">
                  <Icon size={13} className="mr-1.5 inline-block" />
                  {label}
                </Link>
              ))}
            </div>
            <div className="mt-5 flex items-start gap-2 border-t border-white/8 pt-4 text-xs text-white/40">
              <Save size={14} className="mt-0.5 shrink-0" />
              <span>Last browser draft: {lastSaved}</span>
            </div>
            {dashboard && (
              <p className="mt-3 text-[11px] text-white/30">
                Live data refreshed {new Date(dashboard.generatedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
  badge = "Draft workspace",
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neon">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">{description}</p>
      </div>
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200/15 bg-amber-200/5 px-3 py-1.5 text-xs text-amber-100/75">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-200" /> {badge}
      </span>
    </div>
  );
}

function StatCard({ label, value, note, icon: Icon, tone }: {
  label: string;
  value: string;
  note: string;
  icon: typeof FolderKanban;
  tone: "violet" | "cyan" | "green" | "pink";
}) {
  const tones = {
    violet: "bg-violet-300/10 text-violet-200",
    cyan: "bg-cyan-300/10 text-cyan-200",
    green: "bg-emerald-300/10 text-emerald-200",
    pink: "bg-pink-300/10 text-pink-200",
  };
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-white/50">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={17} /></span>
      </div>
      <p className="mt-4 text-2xl font-semibold">{value}</p>
      <p className="mt-1 truncate text-xs text-white/35">{note}</p>
    </div>
  );
}

function ModuleEditor({ moduleKey }: { moduleKey: "settings" }) {
  const details = moduleDetails[moduleKey];
  const storedValues = useSyncExternalStore(
    subscribeToStorage,
    () => window.localStorage.getItem(`portfolio-admin:${moduleKey}`) ?? "",
    () => "",
  );
  const [draftValues, setDraftValues] = useState<Record<string, string> | null>(null);
  let initialValues = moduleDefaults[moduleKey];
  if (storedValues) {
    try {
      initialValues = {
        ...moduleDefaults[moduleKey],
        ...JSON.parse(storedValues) as Record<string, string>,
      };
    } catch {
      initialValues = moduleDefaults[moduleKey];
    }
  }
  const values = draftValues ?? initialValues;
  const [saved, setSaved] = useState(false);

  function updateField(key: string, value: string) {
    setDraftValues((current) => ({ ...(current ?? values), [key]: value }));
    setSaved(false);
  }

  function saveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem(`portfolio-admin:${moduleKey}`, JSON.stringify(values));
    window.localStorage.setItem("portfolio-admin-last-saved", new Date().toISOString());
    setDraftValues(values);
    setSaved(true);
  }

  return (
    <div className="space-y-8">
      <PageHeading eyebrow={details.eyebrow} title={details.title} description={details.description} />
      <form onSubmit={saveDraft} className="glass w-full rounded-2xl">
        <div className="border-b border-white/8 px-5 py-4 sm:px-7">
          <h2 className="text-sm font-semibold">Content details</h2>
          <p className="mt-1 text-xs text-white/40">Changes are stored in this browser as drafts.</p>
        </div>
        <div className="space-y-6 px-5 py-6 sm:px-7 sm:py-7">
          {details.fields.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-2 block text-sm font-medium text-white/80">{field.label}</span>
              {field.key === "visibility" ? (
                <select
                  value={values[field.key] ?? "Public"}
                  onChange={(event) => updateField(field.key, event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#171022] px-4 py-3 text-sm text-white outline-none focus:border-lilac/50"
                >
                  <option>Public</option>
                  <option>Private</option>
                </select>
              ) : field.multiline ? (
                <textarea
                  value={values[field.key] ?? ""}
                  onChange={(event) => updateField(field.key, event.target.value)}
                  rows={field.key === "about" || field.key === "intro" ? 5 : 3}
                  className="w-full resize-y rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-lilac/50"
                />
              ) : (
                <input
                  type={field.type ?? "text"}
                  value={values[field.key] ?? ""}
                  onChange={(event) => updateField(field.key, event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-lilac/50"
                />
              )}
              {field.hint && <span className="mt-2 block text-xs text-white/35">{field.hint}</span>}
            </label>
          ))}
        </div>
        <div className="flex flex-col gap-3 border-t border-white/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p role="status" className="flex min-h-5 items-center gap-2 text-xs text-white/40">
            {saved ? <><Check size={14} className="text-emerald-300" /> Draft saved in this browser. Not published.</> : <><CircleHelp size={14} /> Draft changes do not update the public site.</>}
          </p>
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-400 px-4 py-2.5 text-sm font-semibold text-[#160e23] transition hover:bg-violet-300">
            <Save size={16} /> Save draft
          </button>
        </div>
      </form>
    </div>
  );
}
