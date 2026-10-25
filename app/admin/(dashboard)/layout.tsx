import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { ReactNode } from "react";
import AdminShell from "@/feature/admin/components/AdminShell";
import TopLoadingBar from "@/feature/shared/TopLoadingBar";
import { ADMIN_SESSION_COOKIE, getAdminTokenUserId } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-sm text-white/50">
          Loading admin workspace...
        </main>
      }
    >
      <ProtectedDashboard>{children}</ProtectedDashboard>
    </Suspense>
  );
}

async function ProtectedDashboard({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const userId = getAdminTokenUserId(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!userId) redirect("/admin/login");

  let isCurrentAdmin: boolean;
  try {
    isCurrentAdmin = Boolean(await prisma.user.findUnique({
      where: { id: userId, role: "admin" },
      select: { id: true },
    }));
  } catch (error: unknown) {
    console.error("[admin layout] Failed to validate current admin account:", error);
    throw new Error("Unable to verify admin access. Please try again later.", {
      cause: error,
    });
  }
  if (!isCurrentAdmin) redirect("/admin/login");

  return (
    <>
      <TopLoadingBar />
      <AdminShell>{children}</AdminShell>
    </>
  );
}