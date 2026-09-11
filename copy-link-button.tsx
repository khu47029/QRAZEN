"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface Props {
  url: string;
  className?: string;
}

export function CopyLinkButton({ url, className }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      try {
        document.execCommand("copy");
      } catch {}
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      onClick={copy}
      type="button"
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-mono font-medium text-slate-300 transition-all hover:border-slate-700 hover:bg-slate-800 hover:text-white active:scale-95"
      }
      aria-label="Copy public resolver URL"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5 text-slate-400" />
          <span>Copy URL</span>
        </>
      )}
    </button>
  );
}
