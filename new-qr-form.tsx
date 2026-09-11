"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { uploadFiles } from "@/lib/client-upload";
import {
  Link2,
  FileText,
  Image as ImageIcon,
  FolderArchive,
  Layers,
  Shield,
  Clock,
  Lock,
  Eye,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  FileIcon,
  X,
  Sparkles,
  AlertCircle
} from "lucide-react";

type ContentType = "text" | "url" | "pdf" | "image" | "zip" | "multi";

interface TypeOption {
  value: ContentType;
  label: string;
  icon: typeof Link2;
  hint: string;
  accept?: string;
  multiple?: boolean;
  isFile: boolean;
}

const TYPE_OPTIONS: TypeOption[] = [
  { value: "url", label: "Web Link", icon: Link2, hint: "Point to any HTTPS web destination", isFile: false },
  { value: "pdf", label: "PDF Document", icon: FileText, hint: "Single document with inline viewer", accept: ".pdf,application/pdf", isFile: true },
  { value: "image", label: "Image Gallery", icon: ImageIcon, hint: "PNG, JPG, WebP or GIF format", accept: "image/png,image/jpeg,image/webp,image/gif", isFile: true },
  { value: "text", label: "Text / Secret Note", icon: FileText, hint: "Formatted plain text or instructions", isFile: false },
  { value: "zip", label: "ZIP Archive", icon: FolderArchive, hint: "ZIP with central directory inspection", accept: ".zip,application/zip", isFile: true },
  { value: "multi", label: "File Bundle", icon: Layers, hint: "Group multiple files together", accept: "application/pdf,image/png,image/jpeg,image/webp,image/gif,.zip", multiple: true, isFile: true },
];

export function NewQrForm() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [contentType, setContentType] = useState<ContentType>("url");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [visibility, setVisibility] = useState<"public" | "password">("public");
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [allowDownload, setAllowDownload] = useState(true);
  const [viewOnly, setViewOnly] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const activeType = useMemo(
    () => TYPE_OPTIONS.find((t) => t.value === contentType)!,
    [contentType]
  );

  function pickType(t: ContentType) {
    setContentType(t);
    setText("");
    setUrl("");
    setSelectedFiles([]);
    setError(null);
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files);
    if (activeType.multiple) {
      setSelectedFiles((prev) => [...prev, ...arr]);
    } else {
      setSelectedFiles(arr.slice(0, 1));
    }
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function applyExpiryPreset(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const pad = (n: number) => String(n).padStart(2, "0");
    const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setExpiresAt(formatted);
  }

  function validateStep1(): string | null {
    if (contentType === "text" && !text.trim()) return "Please enter the note or text content.";
    if (contentType === "url") {
      if (!url.trim()) return "Please enter a destination URL.";
      if (!/^https?:\/\//i.test(url.trim())) return "URL must begin with http:// or https://";
    }
    if (activeType.isFile && selectedFiles.length === 0) return "Please choose at least one file to upload.";
    return null;
  }

  function validateStep2(): string | null {
    if (visibility === "password" && password.length < 4) {
      return "Viewer password must be at least 4 characters.";
    }
    if (expiresAt) {
      const d = new Date(expiresAt);
      if (isNaN(d.getTime())) return "Invalid expiry date.";
      if (d.getTime() <= Date.now()) return "Expiry date must be in the future.";
    }
    return null;
  }

  function validateFinal(): string | null {
    if (!name.trim()) return "Give your QR code a name.";
    return validateStep1() || validateStep2();
  }

  function handleNext() {
    setError(null);
    if (step === 1) {
      const err = validateStep1();
      if (err) return setError(err);
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2();
      if (err) return setError(err);
      setStep(3);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validateFinal();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setStatus("Minting access token…");

    try {
      const createRes = await fetch("/api/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contentType,
          visibility,
          viewerPassword: visibility === "password" ? password : undefined,
          allowDownload,
          viewOnly,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          text: contentType === "text" ? text : undefined,
          url: contentType === "url" ? url.trim() : undefined,
        }),
      });

      if (!createRes.ok) {
        const body = await createRes.json().catch(() => ({}));
        throw new Error(body.error || "Could not create the QR code.");
      }

      const { qrCode } = await createRes.json();

      if (activeType.isFile && selectedFiles.length > 0) {
        if (!qrCode.currentContentVersionId) {
          throw new Error("Content slot missing on created code.");
        }
        await uploadFiles(
          selectedFiles,
          qrCode.id,
          qrCode.currentContentVersionId,
          (done, total) => setStatus(`Uploading payload (${done}/${total})…`)
        );
      }

      setStatus("Configuring dynamic gateway…");
      router.push(`/dashboard/${qrCode.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
      setStatus(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Step Stepper Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        {[
          { num: 1, label: "Payload" },
          { num: 2, label: "Security & Rules" },
          { num: 3, label: "Name & Deploy" },
        ].map((s) => (
          <button
            key={s.num}
            type="button"
            disabled={submitting}
            onClick={() => {
              if (s.num < step) setStep(s.num as any);
            }}
            className={`flex items-center gap-2 text-xs font-mono transition-colors ${
              step === s.num
                ? "text-cyan-400 font-bold"
                : step > s.num
                ? "text-emerald-400 cursor-pointer"
                : "text-slate-600 cursor-not-allowed"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold ${
                step === s.num
                  ? "border-cyan-500 bg-cyan-950 text-cyan-300 shadow-[0_0_8px_#06b6d4]"
                  : step > s.num
                  ? "border-emerald-500/40 bg-emerald-950/50 text-emerald-400"
                  : "border-slate-800 bg-slate-900 text-slate-600"
              }`}
            >
              {step > s.num ? "✓" : s.num}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: Payload Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
              <div className="mb-4">
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                  STEP 1 OF 3
                </span>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  Select Content Type
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  What kind of payload will this dynamic QR code deliver?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {TYPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = contentType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => pickType(opt.value)}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                        isSelected
                          ? "border-cyan-500 bg-cyan-950/40 text-white shadow-lg shadow-cyan-950/60 ring-1 ring-cyan-500/40"
                          : "border-slate-800/80 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isSelected ? "bg-cyan-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-300"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="mt-2.5 text-sm font-semibold text-white">
                        {opt.label}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                        {opt.hint}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Payload inputs based on choice */}
              <div className="mt-6 pt-6 border-t border-slate-800/80">
                {contentType === "text" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-mono uppercase text-slate-400">
                      Message / Note Content
                    </label>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={5}
                      maxLength={50000}
                      placeholder="Enter the secret note, instructions, wifi credentials, or formatted message…"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
                    />
                    <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                      <span>Rendered with markdown styling on viewer</span>
                      <span>{text.length} / 50,000 chars</span>
                    </div>
                  </div>
                )}

                {contentType === "url" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-mono uppercase text-slate-400">
                      Destination URL
                    </label>
                    <div className="relative">
                      <Link2 className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://yourcompany.com/landing"
                        maxLength={2048}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Dynamic redirection layer allows updating this link instantly without breaking the QR.
                    </p>
                  </div>
                )}

                {activeType.isFile && (
                  <div className="space-y-3">
                    <label className="block text-xs font-mono uppercase text-slate-400">
                      Upload Files
                    </label>

                    {/* Drag & Drop Zone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        handleFiles(e.dataTransfer.files);
                      }}
                      className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                        dragOver
                          ? "border-cyan-400 bg-cyan-950/30 scale-[1.01]"
                          : "border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900/60"
                      }`}
                    >
                      <UploadCloud className="h-10 w-10 text-cyan-400 mb-2" />
                      <p className="text-sm font-medium text-slate-200">
                        Drag and drop your {activeType.multiple ? "files" : "file"} here, or{" "}
                        <label className="cursor-pointer text-cyan-400 hover:underline">
                          browse
                          <input
                            type="file"
                            accept={activeType.accept}
                            multiple={activeType.multiple}
                            onChange={(e) => handleFiles(e.target.files)}
                            className="hidden"
                          />
                        </label>
                      </p>
                      <p className="text-xs text-slate-500 mt-1 font-mono">
                        {activeType.hint} (Free tier up to 10MB)
                      </p>
                    </div>

                    {/* File list preview */}
                    {selectedFiles.length > 0 && (
                      <ul className="space-y-2 mt-3">
                        {selectedFiles.map((file, i) => (
                          <li
                            key={i}
                            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-300 font-mono"
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <FileIcon className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                              <span className="truncate text-slate-200">{file.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </span>
                              <button
                                type="button"
                                onClick={() => removeFile(i)}
                                className="text-slate-500 hover:text-red-400 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 text-xs font-bold text-slate-950 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98]"
              >
                Proceed to Security Rules <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Access & Governance Rules */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-6">
              <div>
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                  STEP 2 OF 3
                </span>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  Access & Security Governance
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enforce strict cryptographic protection and expiration lifecycles.
                </p>
              </div>

              {/* Password Protection */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800 text-cyan-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Password Protection</div>
                      <div className="text-xs text-slate-400">
                        Require viewers to input a password before accessing the payload.
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibility === "password"}
                      onChange={(e) => setVisibility(e.target.checked ? "password" : "public")}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                {visibility === "password" && (
                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Viewer unlock password (min 4 characters)"
                      minLength={4}
                      maxLength={128}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
                    />
                    <p className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5">
                      <Shield className="h-3 w-3" />
                      Encrypted with Argon2id at rest. Rate-limited against brute-force guessing.
                    </p>
                  </div>
                )}
              </div>

              {/* Expiration Rules */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-800 text-amber-400">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Automated Expiration</div>
                    <div className="text-xs text-slate-400">
                      Token resolver will automatically revoke access after the selected date.
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => applyExpiryPreset(1)}
                    className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-700 font-mono"
                  >
                    +24 Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => applyExpiryPreset(7)}
                    className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-700 font-mono"
                  >
                    +7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => applyExpiryPreset(30)}
                    className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-700 font-mono"
                  >
                    +30 Days
                  </button>
                  {expiresAt && (
                    <button
                      type="button"
                      onClick={() => setExpiresAt("")}
                      className="rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-1.5 text-xs text-red-400 font-mono"
                    >
                      Clear Expiry (Never)
                    </button>
                  )}
                </div>

                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono mt-2"
                />
              </div>

              {/* View-Only / Download Policies for files */}
              {activeType.isFile && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800 text-sky-400">
                      <Eye className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Download Controls</div>
                      <div className="text-xs text-slate-400">
                        Control whether viewers can download the raw binary asset.
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowDownload}
                        onChange={(e) => setAllowDownload(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                      />
                      Allow viewers to download original file
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={viewOnly}
                        onChange={(e) => setViewOnly(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                      />
                      View-only mode (renders inline, suppresses direct download links)
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-5 py-3 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 text-xs font-bold text-slate-950 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20"
              >
                Proceed to Deploy <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Name & Deployment Review */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-6">
              <div>
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                  STEP 3 OF 3
                </span>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  Name & Review Portal
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Assign an administrative label for your dashboard tracking.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase text-slate-400">
                  QR Identifier Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Winter Menu 2026, Q3 Pitch Deck, Customer Onboarding"
                  maxLength={200}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              {/* Review Summary Card */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs space-y-2 text-slate-400">
                <div className="text-slate-200 font-bold border-b border-slate-800 pb-2 flex items-center justify-between">
                  <span>DEPLOYMENT CONFIGURATION</span>
                  <span className="text-[10px] text-cyan-400">READY TO MINT</span>
                </div>
                <div className="flex justify-between">
                  <span>Payload Type:</span>
                  <span className="text-white uppercase">{contentType}</span>
                </div>
                {activeType.isFile && (
                  <div className="flex justify-between">
                    <span>Uploaded Assets:</span>
                    <span className="text-white">{selectedFiles.length} file(s)</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Security Gate:</span>
                  <span className={visibility === "password" ? "text-emerald-400" : "text-slate-400"}>
                    {visibility === "password" ? "Argon2id Password Protected" : "Public Gateway"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Lifespan:</span>
                  <span className={expiresAt ? "text-amber-400" : "text-slate-400"}>
                    {expiresAt ? new Date(expiresAt).toLocaleString() : "Permanent Active"}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-xs text-red-300 font-mono">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-5 py-3 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-8 py-3.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 shadow-xl shadow-cyan-500/25 disabled:opacity-60 transition-all active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <Sparkles className="h-4 w-4 animate-spin text-slate-950" />
                    <span>{status ?? "Minting Dynamic QR…"}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Mint Dynamic QR Gateway</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
