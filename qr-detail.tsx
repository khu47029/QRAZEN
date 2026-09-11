"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { uploadFiles } from "@/lib/client-upload";
import { formatBytes, formatDate } from "@/lib/utils";
import { CopyLinkButton } from "@/components/dashboard/copy-link-button";
import {
  QrCode,
  Download,
  ExternalLink,
  RefreshCw,
  Clock,
  Lock,
  Eye,
  Shield,
  Trash2,
  Power,
  BarChart3,
  Layers,
  FileText,
  Link2,
  Image as ImageIcon,
  FolderArchive,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileIcon,
  X,
  Smartphone,
  Globe,
  Monitor
} from "lucide-react";

type ContentType = "text" | "url" | "pdf" | "image" | "zip" | "multi";

interface QrProps {
  id: string;
  name: string;
  contentType: ContentType;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  currentContentVersionId: string | null;
}

interface RulesProps {
  visibility: "public" | "password";
  allowDownload: boolean;
  viewOnly: boolean;
  hasPassword: boolean;
}

interface FileProps {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}

interface Analytics {
  total: number;
  last30Days: number;
  byDevice: Record<string, number>;
  byCountry: Record<string, number>;
  byBrowser: Record<string, number>;
}

interface Props {
  qr: QrProps;
  rules: RulesProps;
  versionNumber: number;
  files: FileProps[];
  textBody: string | null;
  targetUrl: string | null;
  resolverUrl: string;
  qrPngDataUrl: string;
}

const FILE_ACCEPT: Record<string, { accept: string; multiple: boolean }> = {
  pdf: { accept: ".pdf,application/pdf", multiple: false },
  image: { accept: "image/png,image/jpeg,image/webp,image/gif", multiple: false },
  zip: { accept: ".zip,application/zip", multiple: false },
  multi: { accept: "application/pdf,image/png,image/jpeg,image/webp,image/gif,.zip", multiple: true },
};

const isFileType = (t: ContentType) => t === "pdf" || t === "image" || t === "zip" || t === "multi";

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function QrDetail({
  qr,
  rules,
  versionNumber,
  files,
  textBody,
  targetUrl,
  resolverUrl,
  qrPngDataUrl,
}: Props) {
  const isExpired = !!qr.expiresAt && new Date(qr.expiresAt) <= new Date();

  return (
    <div className="space-y-8">
      {/* Top Overview Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
        {/* Left Column: QR Matrix Card */}
        <div className="lg:col-span-4">
          <QrMatrixCard
            qr={qr}
            resolverUrl={resolverUrl}
            qrPngDataUrl={qrPngDataUrl}
            isExpired={isExpired}
          />
        </div>

        {/* Right Column: Live Content + Instant Replacement */}
        <div className="lg:col-span-8 space-y-6">
          <CurrentContentSection
            qr={qr}
            files={files}
            textBody={textBody}
            targetUrl={targetUrl}
            versionNumber={versionNumber}
          />
          <ReplaceContentSection qr={qr} />
        </div>
      </div>

      {/* Settings & Access Control */}
      <SettingsSection qr={qr} rules={rules} />

      {/* Privacy-Preserving Analytics */}
      <AnalyticsSection qrId={qr.id} />

      {/* Dangerous Operations Zone */}
      <DangerZoneSection qr={qr} />
    </div>
  );
}

// ─── 1. QR MATRIX CARD ───────────────────────────────────────────────────────

function QrMatrixCard({
  qr,
  resolverUrl,
  qrPngDataUrl,
  isExpired,
}: {
  qr: QrProps;
  resolverUrl: string;
  qrPngDataUrl: string;
  isExpired: boolean;
}) {
  const statusLabel = isExpired ? "expired" : qr.status;
  const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
    active: { bg: "bg-emerald-950/60", text: "text-emerald-400", border: "border-emerald-500/30" },
    disabled: { bg: "bg-slate-800/80", text: "text-slate-400", border: "border-slate-700" },
    expired: { bg: "bg-amber-950/60", text: "text-amber-400", border: "border-amber-500/30" },
    deleted: { bg: "bg-red-950/60", text: "text-red-400", border: "border-red-500/30" },
  };
  const currentStatus = statusStyles[statusLabel] ?? statusStyles.disabled;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl space-y-5">
      {/* Title & Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-white tracking-tight">
            {qr.name || "Untitled Gateway"}
          </h1>
          <span className="text-[11px] font-mono text-cyan-400 uppercase">
            IMMUTABLE ACCESS CODE
          </span>
        </div>
        <span
          className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase ${currentStatus.bg} ${currentStatus.text} ${currentStatus.border}`}
        >
          {statusLabel}
        </span>
      </div>

      {/* High-Contrast QR Canvas */}
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-white p-4 shadow-inner flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrPngDataUrl}
          alt={`Dynamic QR code for ${qr.name}`}
          className="h-full w-full object-contain"
        />
      </div>

      {/* Vector / Raster Export Actions */}
      <div className="grid grid-cols-2 gap-2">
        <a
          href={`/api/qr/${qr.id}/qr-image?format=png&download=1`}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2.5 text-xs font-mono font-semibold text-white transition-colors hover:bg-slate-700 hover:text-cyan-300"
        >
          <Download className="h-3.5 w-3.5" /> PNG (320px)
        </a>
        <a
          href={`/api/qr/${qr.id}/qr-image?format=svg&download=1`}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs font-mono font-semibold text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-900 hover:text-white"
        >
          <Download className="h-3.5 w-3.5" /> SVG Vector
        </a>
      </div>

      {/* Public Resolver URL Info */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2 text-xs font-mono">
        <div className="text-slate-400 text-[10px]">RESOLVER ENDPOINT</div>
        <div className="flex items-center justify-between gap-2">
          <a
            href={resolverUrl}
            target="_blank"
            rel="noreferrer"
            className="truncate text-cyan-400 hover:underline text-xs"
          >
            {resolverUrl}
          </a>
          <a
            href={resolverUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1 rounded text-slate-400 hover:text-white"
            title="Open live resolver"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-slate-500 text-[11px]">Instant Share</span>
          <CopyLinkButton url={resolverUrl} />
        </div>
      </div>
    </div>
  );
}

// ─── 2. CURRENT CONTENT SECTION ──────────────────────────────────────────────

function CurrentContentSection({
  qr,
  files,
  textBody,
  targetUrl,
  versionNumber,
}: {
  qr: QrProps;
  files: FileProps[];
  textBody: string | null;
  targetUrl: string | null;
  versionNumber: number;
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
            ACTIVE PAYLOAD
          </span>
          <h2 className="text-lg font-bold text-white">Live Version v{versionNumber}</h2>
        </div>
        <span className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-xs font-mono text-slate-400">
          TYPE: {qr.contentType.toUpperCase()}
        </span>
      </div>

      {qr.contentType === "text" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
          {textBody || <span className="text-slate-500">No message body set.</span>}
        </div>
      )}

      {qr.contentType === "url" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm">
          {targetUrl ? (
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-cyan-400 flex-shrink-0" />
              <a
                href={targetUrl}
                target="_blank"
                rel="noreferrer"
                className="break-all text-cyan-400 hover:underline"
              >
                {targetUrl}
              </a>
            </div>
          ) : (
            <span className="text-slate-500">No URL destination configured.</span>
          )}
        </div>
      )}

      {isFileType(qr.contentType) && (
        <div className="space-y-3">
          {files.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-amber-900/40 bg-amber-950/20 p-4 text-xs font-mono text-amber-300">
              No binary payload uploaded yet — use “Mutate / Replace Content” below to attach assets.
            </div>
          ) : (
            <ul className="space-y-2">
              {files.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-3.5 text-xs font-mono"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileIcon className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-200">{f.originalFilename}</p>
                      <p className="text-[11px] text-slate-500">
                        {f.mimeType} · {formatBytes(f.sizeBytes)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={`/api/serve/${f.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-slate-300 hover:text-white"
                    >
                      Preview
                    </a>
                    <a
                      href={`/api/serve/${f.id}?download=1`}
                      className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1.5 text-cyan-300 hover:bg-cyan-500/20"
                    >
                      Download
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

// ─── 3. REPLACE / MUTATE CONTENT SECTION ──────────────────────────────────────

function ReplaceContentSection({ qr }: { qr: QrProps }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileCfg = FILE_ACCEPT[qr.contentType];

  function reset() {
    setText("");
    setUrl("");
    setSelectedFiles([]);
    setError(null);
    setStatus(null);
  }

  async function submit() {
    setError(null);

    if (qr.contentType === "text" && !text.trim()) return setError("Enter the replacement text.");
    if (qr.contentType === "url") {
      if (!url.trim()) return setError("Enter the replacement URL.");
      if (!/^https?:\/\//i.test(url.trim())) return setError("URL must start with http:// or https://");
    }
    if (isFileType(qr.contentType) && selectedFiles.length === 0) return setError("Choose a file to upload.");

    setBusy(true);
    setStatus("Minting new version slot…");

    try {
      const body: Record<string, unknown> = { contentType: qr.contentType };
      if (qr.contentType === "text") body.text = text;
      if (qr.contentType === "url") body.url = url.trim();

      const res = await fetch(`/api/qr/${qr.id}/replace-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "Could not replace content.");
      }

      const { contentVersion } = await res.json();

      if (isFileType(qr.contentType)) {
        await uploadFiles(selectedFiles, qr.id, contentVersion.id, (done, total) =>
          setStatus(`Uploading asset (${done}/${total})…`)
        );
      }

      setStatus("Version rotated successfully ✓");
      reset();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
            DYNAMIC POINTER ROTATION
          </span>
          <h2 className="text-lg font-bold text-white">Mutate / Replace Content</h2>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20 transition-all active:scale-95"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Update Content
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-400">
        The printed QR code remains 100% unchanged. Only the destination pointer will atomically update.
      </p>

      {open && (
        <div className="mt-5 space-y-4 pt-4 border-t border-slate-800">
          {qr.contentType === "text" && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={50000}
              placeholder="Enter the updated message or note…"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
            />
          )}

          {qr.contentType === "url" && (
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yournewdestination.com/updated"
              maxLength={2048}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
            />
          )}

          {isFileType(qr.contentType) && fileCfg && (
            <div className="space-y-2">
              <input
                type="file"
                accept={fileCfg.accept}
                multiple={fileCfg.multiple}
                onChange={(e) => setSelectedFiles(e.target.files ? Array.from(e.target.files) : [])}
                className="block w-full text-xs font-mono text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500 file:px-3 file:py-2 file:text-xs file:font-bold file:text-slate-950 hover:file:bg-cyan-400 cursor-pointer"
              />
              {selectedFiles.length > 0 && (
                <p className="text-[11px] text-cyan-400 font-mono">
                  {selectedFiles.length} replacement file(s) staged.
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-2.5 text-xs text-red-300 font-mono">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={submit}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20 disabled:opacity-50"
            >
              {busy ? status ?? "Processing…" : "Publish New Version"}
            </button>
            <button
              onClick={() => {
                reset();
                setOpen(false);
              }}
              disabled={busy}
              className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── 4. SETTINGS & GOVERNANCE SECTION ────────────────────────────────────────

function SettingsSection({ qr, rules }: { qr: QrProps; rules: RulesProps }) {
  const router = useRouter();
  const [name, setName] = useState(qr.name);
  const [expiresAt, setExpiresAt] = useState(toDatetimeLocal(qr.expiresAt));
  const [allowDownload, setAllowDownload] = useState(rules.allowDownload);
  const [viewOnly, setViewOnly] = useState(rules.viewOnly);
  const [passwordProtected, setPasswordProtected] = useState(rules.visibility === "password");
  const [newPassword, setNewPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileType = isFileType(qr.contentType);

  async function save() {
    setError(null);
    setMsg(null);

    if (name.trim().length === 0) return setError("Name cannot be empty.");
    if (expiresAt) {
      const d = new Date(expiresAt);
      if (isNaN(d.getTime())) return setError("Invalid expiry date format.");
    }
    if (passwordProtected && !rules.hasPassword && newPassword.length < 4) {
      return setError("Set a password of at least 4 characters.");
    }
    if (passwordProtected && newPassword.length > 0 && newPassword.length < 4) {
      return setError("Password must be at least 4 characters.");
    }

    const body: Record<string, unknown> = {
      name: name.trim(),
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    };
    if (fileType) {
      body.allowDownload = allowDownload;
      body.viewOnly = viewOnly;
    }

    if (!passwordProtected && rules.hasPassword) {
      body.viewerPassword = null;
    } else if (passwordProtected) {
      body.visibility = "password";
      if (newPassword.length >= 4) body.viewerPassword = newPassword;
    } else {
      body.visibility = "public";
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/qr/${qr.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "Could not save configuration.");
      }
      setMsg("Settings updated ✓");
      setNewPassword("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-6">
      <div>
        <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
          ACCESS GOVERNANCE
        </span>
        <h2 className="text-lg font-bold text-white">Gateway Rules & Settings</h2>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono uppercase text-slate-400">
            Gateway Label
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Expiry */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono uppercase text-slate-400">
            Expiration Timestamp
          </label>
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
            />
            {expiresAt && (
              <button
                type="button"
                onClick={() => setExpiresAt("")}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 text-xs font-mono text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Password Protection */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
        <label className="flex items-center gap-2.5 text-sm font-semibold text-white cursor-pointer">
          <input
            type="checkbox"
            checked={passwordProtected}
            onChange={(e) => setPasswordProtected(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
          />
          Enforce Argon2id Password Protection
        </label>
        {passwordProtected && (
          <div className="space-y-1.5 pt-1">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={
                rules.hasPassword
                  ? "Enter new password to rotate it (or leave blank to keep)"
                  : "Set a password (minimum 4 characters)"
              }
              minLength={4}
              maxLength={128}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        )}
      </div>

      {/* Download controls */}
      {fileType && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
          <div className="text-xs font-mono uppercase text-slate-400 mb-1">
            File Delivery Modes
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={allowDownload}
              onChange={(e) => setAllowDownload(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
            />
            Allow viewers to download original binary files
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={viewOnly}
              onChange={(e) => setViewOnly(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
            />
            View-only inline sandbox mode
          </label>
        </div>
      )}

      {error && <p className="text-xs font-mono text-red-400">{error}</p>}
      {msg && <p className="text-xs font-mono text-emerald-400">{msg}</p>}

      <div>
        <button
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20 disabled:opacity-50"
        >
          {busy ? "Applying Changes…" : "Save Governance Rules"}
        </button>
      </div>
    </section>
  );
}

// ─── 5. ANALYTICS SECTION ───────────────────────────────────────────────────

function AnalyticsSection({ qrId }: { qrId: string }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/qr/${qrId}/analytics`);
      if (!res.ok) throw new Error("Could not load analytics.");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load telemetry.");
    } finally {
      setLoading(false);
    }
  }, [qrId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
            PRIVACY-SAFE TELEMETRY
          </span>
          <h2 className="text-lg font-bold text-white">Scan Activity & Distribution</h2>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-cyan-400"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {loading && <p className="text-xs font-mono text-slate-500">Querying telemetry database…</p>}
      {error && <p className="text-xs font-mono text-red-400">{error}</p>}

      {data && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <span className="text-[10px] font-mono text-slate-500 uppercase">LIFETIME SCANS</span>
              <p className="text-3xl font-bold text-white font-mono mt-1">{data.total}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <span className="text-[10px] font-mono text-slate-500 uppercase">LAST 30 DAYS</span>
              <p className="text-3xl font-bold text-cyan-400 font-mono mt-1">{data.last30Days}</p>
            </div>
          </div>

          {data.total === 0 ? (
            <p className="text-xs font-mono text-slate-500 py-4 text-center">
              No scans recorded yet. Share your QR code to capture engagement telemetry.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <DistributionCard title="Device Platform" rows={data.byDevice} icon={Smartphone} />
              <DistributionCard title="Geo / Origin" rows={data.byCountry} icon={Globe} />
              <DistributionCard title="Browser Engine" rows={data.byBrowser} icon={Monitor} />
            </div>
          )}

          <p className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/80">
            Privacy Guarantee: No raw IP addresses or cross-site tracking cookies are recorded.
          </p>
        </div>
      )}
    </section>
  );
}

function DistributionCard({
  title,
  rows,
  icon: Icon,
}: {
  title: string;
  rows: Record<string, number>;
  icon: typeof Smartphone;
}) {
  const entries = Object.entries(rows).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((acc, curr) => acc + curr[1], 0);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
        <Icon className="h-3.5 w-3.5 text-cyan-400" />
        <span className="font-semibold">{title}</span>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-slate-600 font-mono">—</p>
      ) : (
        <ul className="space-y-2">
          {entries.map(([key, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <li key={key} className="space-y-1">
                <div className="flex justify-between text-xs font-mono text-slate-300">
                  <span className="capitalize truncate">{key}</span>
                  <span className="text-slate-400">{count} ({pct}%)</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── 6. DANGER ZONE SECTION ─────────────────────────────────────────────────

function DangerZoneSection({ qr }: { qr: QrProps }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canToggle = qr.status === "active" || qr.status === "disabled";
  const nextStatus = qr.status === "active" ? "disabled" : "active";

  async function toggleStatus() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/qr/${qr.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "Could not toggle status.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Are you sure you want to delete this dynamic QR? Access will terminate immediately.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/qr/${qr.id}`, { method: "DELETE" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "Could not delete gateway.");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-red-950/60 bg-red-950/10 p-6 shadow-xl space-y-4">
      <div>
        <span className="text-xs font-mono text-red-400 uppercase tracking-wider">
          CRITICAL OPERATIONS
        </span>
        <h2 className="text-lg font-bold text-red-200">Danger Zone</h2>
      </div>
      <p className="text-xs text-slate-400">
        Disabling stops the resolver while preserving configuration for reactivation. Deleting permanently removes the gateway.
      </p>

      {error && <p className="text-xs font-mono text-red-400">{error}</p>}

      <div className="flex flex-wrap gap-3 pt-2">
        {canToggle && (
          <button
            onClick={toggleStatus}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-mono font-semibold text-slate-300 hover:text-white disabled:opacity-50"
          >
            <Power className="h-3.5 w-3.5" />
            {qr.status === "active" ? "Disable Gateway" : "Re-Enable Gateway"}
          </button>
        )}
        <button
          onClick={remove}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-xl border border-red-900/40 bg-red-950/40 px-4 py-2 text-xs font-mono font-semibold text-red-300 hover:bg-red-900/40 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete Gateway
        </button>
      </div>
    </section>
  );
}
