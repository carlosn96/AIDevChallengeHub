import type { ReactNode } from "react";
import Header from "@/components/header";
import AuthGuard from "@/components/auth-guard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen w-full flex-col">
        <Header />
        <main className="flex flex-1 flex-col p-4 md:p-8">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
