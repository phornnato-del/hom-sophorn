import { Suspense } from "react";
import type { ReactNode } from "react";
import AdminShell from "@/feature/admin/components/AdminShell";
import TopLoadingBar from "@/feature/shared/TopLoadingBar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-sm text-white/50">
          Loading admin workspace...
        </main>
      }
    >
      <>
        <TopLoadingBar />
        <AdminShell>{children}</AdminShell>
      </>
    </Suspense>
  );
}