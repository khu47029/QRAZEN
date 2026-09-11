"use client";

import { useState } from "react";
import { FileText, Copy, Check } from "lucide-react";

interface Props {
  text: string;
}

export function TextViewer({ text }: Props) {
  const [copied, setCopied] = useState(false);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-slate-800 text-cyan-400">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Note Payload
            </span>
            <div className="text-[11px] text-slate-400 font-mono">
              {wordCount} words · {charCount} chars
            </div>
          </div>
        </div>

        <button
          onClick={copyText}
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-mono text-slate-300 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-slate-400" />
              <span>Copy Note</span>
            </>
          )}
        </button>
      </div>

      {/* Body */}
      <div className="p-6 sm:p-8 bg-slate-950/60">
        <pre className="whitespace-pre-wrap break-words font-sans text-slate-200 text-sm sm:text-base leading-relaxed selection:bg-cyan-500/20 selection:text-cyan-200">
          {text}
        </pre>
      </div>
    </div>
  );
}
