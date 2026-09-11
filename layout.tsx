import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { runMigrations } from "@/db/migrate";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { Plus, User } from "lucide-react";
import { QrazenLogo } from "@/components/brand/qrazen-logo";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await runMigrations();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-6">
            <QrazenLogo href="/dashboard" variant="compact" />

            <nav className="hidden md:flex items-center gap-1 text-xs font-mono">
              <Link
                href="/dashboard"
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-cyan-400 font-semibold border border-slate-800"
              >
                Access Portals
              </Link>
              <Link
                href="/legal/aup"
                className="rounded-lg px-3 py-1.5 text-slate-400 hover:text-slate-200 transition-colors"
              >
                Policies
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-md shadow-cyan-500/20 hover:bg-cyan-400 transition-all active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Mint QR</span>
            </Link>

            <div className="hidden sm:flex items-center gap-2 border-l border-slate-800 pl-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
                <User className="h-3.5 w-3.5 text-slate-500" />
                <span className="truncate max-w-[140px]">{user.name || user.email}</span>
              </div>
              <span className="rounded-md border border-cyan-500/30 bg-cyan-950/50 px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-cyan-300">
                {user.plan}
              </span>
            </div>

            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative pb-16">
        {children}
      </div>
    </div>
  );
}
