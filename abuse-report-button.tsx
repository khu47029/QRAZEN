"use client";

import { useState } from "react";
import { Flag, X, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  qrCodeId: string;
}

const REASONS = [
  { value: "illegal", label: "Illegal content" },
  { value: "malware", label: "Malware or harmful executable" },
  { value: "phishing", label: "Phishing or scam attempt" },
  { value: "copyright", label: "Copyright / DMCA violation" },
  { value: "spam", label: "Unsolicited spam" },
  { value: "other", label: "Other trust & safety concern" },
] as const;

export function AbuseReportButton({ qrCodeId }: Props) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    setError(null);

    const form = e.currentTarget;
    const reason = (form.elements.namedItem("reason") as HTMLSelectElement).value;
    const details = (form.elements.namedItem("details") as HTMLTextAreaElement).value;

    try {
      const res = await fetch("/api/abuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCodeId, reason, details: details || undefined }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Could not submit abuse report.");
        setState("error");
        return;
      }

      setState("done");
    } catch {
      setError("Network error. Please try again.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400" role="status">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>Report received for Trust & Safety review.</span>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-slate-300 transition-colors"
      >
        <Flag className="h-3 w-3" />
        <span>Report Abuse</span>
      </button>
    );
  }

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <Flag className="h-3.5 w-3.5 text-red-400" />
          <span>Report Content Abuse</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close report form"
          className="text-slate-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="reason" className="mb-1 block text-xs font-mono text-slate-400">
            Violation Reason
          </label>
          <select
            id="reason"
            name="reason"
            required
            defaultValue=""
            className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500 font-mono"
          >
            <option value="" disabled>
              Select violation category…
            </option>
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="details" className="mb-1 block text-xs font-mono text-slate-400">
            Additional Details <span className="text-slate-500">(optional)</span>
          </label>
          <textarea
            id="details"
            name="details"
            rows={3}
            maxLength={2000}
            className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500 font-mono"
            placeholder="Help our moderation team investigate faster…"
          />
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-300 font-mono">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={state === "loading"}
          className="w-full rounded-xl bg-red-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-red-400 disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {state === "loading" ? "Submitting…" : "Submit Report"}
        </button>
      </form>
    </div>
  );
}
