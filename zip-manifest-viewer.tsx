"use client";

import { useState } from "react";
import { formatBytes } from "@/lib/utils";
import { FolderArchive, Download, Search, FileCode, FileText, Image as ImageIcon, File } from "lucide-react";

interface ZipEntry {
  filename: string;
  compressedSize: number;
  uncompressedSize: number;
  isDirectory: boolean;
}

interface ZipManifest {
  valid: boolean;
  totalEntries: number;
  totalUncompressedBytes: number;
  entries: ZipEntry[];
}

interface Props {
  fileId: string;
  filename: string;
  manifestJson: string | null | undefined;
  allowDownload: boolean;
}

function getFileIcon(name: string) {
  if (/\.(jpe?g|png|gif|webp|svg)$/i.test(name)) return ImageIcon;
  if (/\.(json|js|ts|jsx|tsx|html|css|py|rs|go|c|cpp)$/i.test(name)) return FileCode;
  if (/\.(pdf|txt|md|docx?|csv)$/i.test(name)) return FileText;
  return File;
}

export function ZipManifestViewer({ fileId, filename, manifestJson, allowDownload }: Props) {
  const [query, setQuery] = useState("");

  let manifest: ZipManifest | null = null;
  if (manifestJson) {
    try {
      manifest = JSON.parse(manifestJson);
    } catch {}
  }

  const allEntries = manifest?.entries?.filter((e) => !e.isDirectory) ?? [];
  const filteredEntries = query.trim()
    ? allEntries.filter((e) => e.filename.toLowerCase().includes(query.toLowerCase()))
    : allEntries;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-slate-800 text-cyan-400 flex-shrink-0">
            <FolderArchive className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono truncate">
              ZIP Archive Manifest
            </h2>
            <div className="text-[11px] text-slate-400 font-mono truncate">
              {filename} {manifest && `· ${allEntries.length} items (${formatBytes(manifest.totalUncompressedBytes)})`}
            </div>
          </div>
        </div>

        {allowDownload && (
          <a
            href={`/api/serve/${fileId}?download=1`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 text-xs font-mono font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-colors flex-shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download ZIP</span>
          </a>
        )}
      </div>

      {/* Search Filter Bar */}
      {allEntries.length > 5 && (
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/60">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files inside archive…"
              className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        </div>
      )}

      {/* Entry List */}
      {filteredEntries.length > 0 ? (
        <ul className="divide-y divide-slate-800/60 max-h-[60vh] overflow-y-auto">
          {filteredEntries.map((entry, i) => {
            const Icon = getFileIcon(entry.filename);
            return (
              <li
                key={i}
                className="px-6 py-3 flex items-center justify-between text-xs font-mono hover:bg-slate-950/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 truncate min-w-0 pr-4">
                  <Icon className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                  <span className="text-slate-200 truncate">{entry.filename}</span>
                </div>
                <span className="text-slate-500 flex-shrink-0">
                  {formatBytes(entry.uncompressedSize)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="p-8 text-center text-xs font-mono text-slate-500">
          {allEntries.length === 0
            ? "No central directory entries found."
            : "No files matched your search filter."}
        </div>
      )}

      {!allowDownload && (
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 text-[11px] font-mono text-slate-500 text-center">
          The owner has disabled binary file downloads for this portal.
        </div>
      )}
    </div>
  );
}
