"use client";

import { useState } from "react";
import { FileText, Download, ExternalLink, RefreshCw } from "lucide-react";

interface Props {
  fileId: string;
  filename: string;
  allowDownload: boolean;
}

export function PdfViewer({ fileId, filename, allowDownload }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const pdfUrl = `/api/serve/${fileId}`;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-slate-800 text-cyan-400 flex-shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono truncate">
              PDF Document
            </h2>
            <div className="text-[11px] text-slate-400 font-mono truncate">
              {filename}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-mono text-slate-300 hover:text-white"
            title="Open in external tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Tab</span>
          </a>

          {allowDownload && (
            <a
              href={`/api/serve/${fileId}?download=1`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 text-xs font-mono font-semibold text-cyan-300 hover:bg-cyan-500/20"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download</span>
            </a>
          )}
        </div>
      </div>

      {/* PDF Stage */}
      {error ? (
        <div className="p-12 text-center text-slate-400 font-mono text-xs space-y-2">
          <p>Unable to preview this PDF document inline in this browser.</p>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-cyan-400 hover:underline"
          >
            Click here to open PDF directly →
          </a>
        </div>
      ) : (
        <div className="relative bg-slate-950">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm z-10">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading Document Canvas…</span>
              </div>
            </div>
          )}
          <iframe
            src={pdfUrl}
            title={filename}
            className="w-full bg-slate-900"
            style={{ height: "78vh", minHeight: 480 }}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </div>
      )}
    </div>
  );
}
