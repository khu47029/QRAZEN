import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { getQrCodesByOwner, getScanCountsByQrIds } from "@/lib/queries";
import { GatewayListView } from "@/components/dashboard/gateway-list-view";
import {
  Plus,
  QrCode,
  TrendingUp,
  ShieldCheck,
  Activity,
  Sparkles
} from "lucide-react";

export const metadata = { title: "Portal Workstation" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const codes = await getQrCodesByOwner(user.id);
  const scanCounts = await getScanCountsByQrIds(codes.map((c) => c.id));

  const totalScans = Object.values(scanCounts).reduce((a, b) => a + b, 0);
  const activeCount = codes.filter(
    (c) => c.status === "active" && (!c.expiresAt || new Date(c.expiresAt) > new Date())
  ).length;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      {/* Workstation Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
            <Activity className="h-3.5 w-3.5 animate-pulse" />
            <span>GATEWAY WORKSTATION</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Active QR Gateways
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Monitor, rotate, and manage your dynamic access tokens from a single control point.
          </p>
        </div>

        <Link
          href="/dashboard/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 transition-all active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>Mint Dynamic QR</span>
        </Link>
      </div>

      {/* Telemetry Metric Bar */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>TOTAL GATEWAYS</span>
            <QrCode className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-mono">{codes.length}</span>
            <span className="text-xs text-slate-500 font-mono">
              ({activeCount} Active)
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>AGGREGATE SCANS</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-mono">{totalScans}</span>
            <span className="text-xs text-slate-500 font-mono">Privacy-safe pings</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>INFRASTRUCTURE TIER</span>
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-cyan-400 font-mono uppercase">{user.plan}</span>
            <span className="text-xs text-slate-500 font-mono">100% SLA uptime</span>
          </div>
        </div>
      </div>

      {/* Interactive Gateway List or Empty State */}
      {codes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Sparkles className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No Dynamic Gateways Yet</h2>
          <p className="mx-auto mb-8 max-w-md text-sm text-slate-400 leading-relaxed">
            Mint your first dynamic access portal. Upload documents, photos, links, or notes to generate an immutable QR code you can reconfigure anytime.
          </p>
          <Link
            href="/dashboard/new"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-3.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 shadow-xl shadow-cyan-500/25 transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Create Your First Dynamic QR</span>
          </Link>
        </div>
      ) : (
        <GatewayListView codes={codes} scanCounts={scanCounts} />
      )}
    </main>
  );
}
