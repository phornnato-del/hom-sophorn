import { notFound } from "next/navigation";
import AdminContent from "@/feature/admin/components/AdminContent";

const modules = ["admin", "hero", "about", "projects", "tasks", "contact", "settings"] as const;

export default async function AdminModulePage({
  params,
}: PageProps<"/admin/[section]">) {
  const { section } = await params;
  if (!modules.includes(section as (typeof modules)[number])) notFound();

  return <AdminContent moduleKey={section as (typeof modules)[number]} />;
}