import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4 text-center">
      <div className="max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
          <Search className="h-8 w-8" />
        </div>
        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">
          ERROR 404
        </span>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-1 mb-2">
          Page Not Found
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          The requested gateway route or access token does not exist or has been relocated.
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition-all active:scale-[0.98] shadow-lg shadow-cyan-500/20"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Return to Gateway
        </Link>
      </div>
    </main>
  );
}
