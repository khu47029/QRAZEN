"use client";

import { useState } from "react";
import { Lock, Shield, ArrowRight, AlertCircle, KeyRound, Sparkles } from "lucide-react";

interface Props {
  qrCodeId: string;
  token: string;
}

export function PasswordGate({ qrCodeId, token }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "error" | "locked">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    setError(null);

    const password = (e.currentTarget.elements.namedItem("password") as HTMLInputElement).value;

    const res = await fetch(`/r/${token}/verify-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      window.location.reload();
      return;
    }

    const body = await res.json().catch(() => ({}));
    if (res.status === 429 || body.locked) {
      setState("locked");
    } else {
      setState("error");
    }
    setError(body.error || "Incorrect password.");
  }

  return (
    <div className="flex items-center justify-center min-h-[65vh] px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Lock className="h-8 w-8" />
          </div>
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">
            AUTHENTICATION GATEWAY
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            Protected Content Access
          </h1>
          <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
            The owner of this dynamic gateway has enabled cryptographic password protection. Please enter the access key to decrypt.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-mono uppercase text-slate-400">
              Access Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                id="password"
                name="password"
                type="password"
                autoFocus
                required
                disabled={state === "locked"}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono disabled:opacity-50"
                placeholder="Enter password…"
              />
            </div>
          </div>

          {error && (
            <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-xs text-red-300 font-mono">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={state === "loading" || state === "locked"}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-all active:scale-[0.98] shadow-lg shadow-cyan-500/20"
          >
            {state === "loading" ? (
              <span>Authenticating Session…</span>
            ) : state === "locked" ? (
              <span>Rate Limit Lockout</span>
            ) : (
              <>
                <span>Unlock & Access Content</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
          <p className="text-[11px] font-mono text-slate-500 flex items-center justify-center gap-1.5">
            <Shield className="h-3 w-3 text-emerald-400" />
            Protected by Argon2id Cryptographic Verification
          </p>
        </div>
      </div>
    </div>
  );
}
