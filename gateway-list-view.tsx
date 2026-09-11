"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { buildResolverUrl } from "@/lib/qr-generator";
import { formatDate } from "@/lib/utils";
import { CopyLinkButton } from "@/components/dashboard/copy-link-button";
import {
  FileText,
  Link2,
  Image as ImageIcon,
  FolderArchive,
  Layers,
  Search,
  Eye,
  ArrowRight,
  Filter,
  Sparkles,
  Plus
} from "lucide-react";

interface QrItem {
  id: string;
  name: string;
  contentType: string;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  publicToken: string;
}

interface Props {
  codes: QrItem[];
  scanCounts: Record<string, number>;
}

const CONTENT_ICONS: Record<string, typeof FileText> = {
  text: FileText,
  url: Link2,
  pdf: FileText,
  image: ImageIcon,
  zip: FolderArchive,
  multi: Layers,
};

const CONTENT_LABELS: Record<string, string> = {
  text: "Text / Note",
  url: "Dynamic Link",
  pdf: "PDF Document",
  image: "Image Gallery",
  zip: "ZIP Archive",
  multi: "File Bundle",
};

export function GatewayListView({ codes, scanCounts }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired" | "disabled">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filteredCodes = useMemo(() => {
    return codes.filter((code) => {
      const isExpired = !!code.expiresAt && new Date(code.expiresAt) <= new Date();
      const currentEffectiveStatus = isExpired ? "expired" : code.status;

      // Status filter
      if (statusFilter !== "all" && currentEffectiveStatus !== statusFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== "all" && code.contentType !== typeFilter) {
        return false;
      }

      // Keyword Search
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchName = (code.name || "").toLowerCase().includes(q);
        const matchToken = (code.publicToken || "").toLowerCase().includes(q);
        if (!matchName && !matchToken) return false;
      }

      return true;
    });
  }, [codes, query, statusFilter, typeFilter]);

  return (
    <div className="space-y-6">
      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-3 shadow-lg">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search gateways by name or token…"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(["all", "active", "expired", "disabled"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-mono capitalize transition-colors ${
                statusFilter === st
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Filtered Gateways */}
      {filteredCodes.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-500 font-mono text-xs">
          No dynamic gateways matched your current search and filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCodes.map((code) => {
            const resolverUrl = buildResolverUrl(code.publicToken);
            const isExpired =
              !!code.expiresAt && new Date(code.expiresAt) <= new Date();
            const Icon = CONTENT_ICONS[code.contentType] ?? FileText;

            return (
              <div
                key={code.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl transition-all duration-200 hover:border-slate-700 hover:bg-slate-900"
              >
                <div>
                  {/* Card Header */}
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-800 text-cyan-400 border border-slate-700 group-hover:scale-105 transition-transform">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate font-bold text-white text-base leading-tight">
                          {code.name || "Untitled Gateway"}
                        </h2>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {CONTENT_LABELS[code.contentType] ?? code.contentType}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={isExpired ? "expired" : code.status} />
                  </div>

                  {/* Token & Stats Box */}
                  <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3.5 font-mono text-xs text-slate-400 space-y-2 mb-5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[10px]">TOTAL SCANS</span>
                      <span className="font-bold text-white flex items-center gap-1">
                        <Eye className="h-3 w-3 text-cyan-400" />
                        {scanCounts[code.id] ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-800/60 pt-1.5">
                      <span className="text-slate-500 text-[10px]">MINTED</span>
                      <span className="text-slate-300 text-[11px]">{formatDate(code.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-800/60 pt-1.5">
                      <span className="text-slate-500 text-[10px]">LIFESPAN</span>
                      <span className={code.expiresAt ? "text-amber-300 text-[11px]" : "text-emerald-400 text-[11px]"}>
                        {code.expiresAt ? formatDate(code.expiresAt) : "Permanent"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="mt-auto flex items-center gap-2 pt-2 border-t border-slate-800/80">
                  <Link
                    href={`/dashboard/${code.id}`}
                    className="flex-1 rounded-xl bg-slate-800 px-3 py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-slate-700 hover:text-cyan-300 flex items-center justify-center gap-1"
                  >
                    Manage Gateway <ArrowRight className="h-3 w-3" />
                  </Link>
                  <CopyLinkButton url={resolverUrl} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    active: { bg: "bg-emerald-950/60", text: "text-emerald-400", border: "border-emerald-500/30" },
    disabled: { bg: "bg-slate-800/80", text: "text-slate-400", border: "border-slate-700" },
    expired: { bg: "bg-amber-950/60", text: "text-amber-400", border: "border-amber-500/30" },
    deleted: { bg: "bg-red-950/60", text: "text-red-400", border: "border-red-500/30" },
  };

  const current = styles[status] ?? styles.disabled;

  return (
    <span
      className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider ${current.bg} ${current.text} ${current.border}`}
    >
      {status}
    </span>
  );
}
