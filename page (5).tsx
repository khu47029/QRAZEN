import { NewQrForm } from "@/components/dashboard/new-qr-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Create Dynamic QR Gateway" };

// Depends on the signed-in user; never cache across sessions.
export const dynamic = "force-dynamic";

export default function NewQrPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Gateway Dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Mint New Dynamic QR Gateway
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          The generated QR image remains permanently immutable — update or swap the content payload behind it anytime without reprinting.
        </p>
      </div>

      <NewQrForm />
    </main>
  );
}
