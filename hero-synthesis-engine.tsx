"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import Link from "next/link";
import {
  FileText,
  Link2,
  Lock,
  FolderArchive,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Eye,
  Radio,
  Smartphone,
  Layers,
  Zap,
  Check,
  ChevronRight,
  Play
} from "lucide-react";

interface ContentPreset {
  id: string;
  name: string;
  type: "pdf" | "url" | "text" | "bundle";
  badge: string;
  icon: typeof FileText;
  headline: string;
  summary: string;
  metadata: {
    size: string;
    security: string;
    expiry: string;
    token: string;
  };
  payload: string;
  viewerPreview: {
    title: string;
    subtitle: string;
    body: string;
    actionText?: string;
  };
}

const PRESETS: ContentPreset[] = [
  {
    id: "doc",
    name: "Architectural_Blueprints_v4.pdf",
    type: "pdf",
    badge: "Document (4.2 MB)",
    icon: FileText,
    headline: "High-Resolution Engineering Whitepaper",
    summary: "Single vectorized PDF document rendered in sandboxed viewer",
    metadata: {
      size: "4.2 MB Vector PDF",
      security: "Encrypted at Rest",
      expiry: "Valid for 30 Days",
      token: "tok_arch_8f9c2",
    },
    payload: "https://qrcontent.io/r/tok_arch_8f9c2",
    viewerPreview: {
      title: "Architectural Blueprints v4.0",
      subtitle: "Verified PDF Document · 4.2 MB",
      body: "Viewing vector schematics and structural layouts. Document sandboxed directly in browser with full pinch-to-zoom.",
      actionText: "Download PDF (4.2 MB)",
    },
  },
  {
    id: "url",
    name: "Enterprise Cloud Portal",
    type: "url",
    badge: "Dynamic Link",
    icon: Link2,
    headline: "Smart load-balanced destination gateway",
    summary: "Instant HTTPS redirect without exposing intermediary servers",
    metadata: {
      size: "Instant 12ms Redirect",
      security: "HTTPS TLS 1.3",
      expiry: "Permanent Active",
      token: "tok_prod_44d1a",
    },
    payload: "https://qrcontent.io/r/tok_prod_44d1a",
    viewerPreview: {
      title: "Redirecting to Destination…",
      subtitle: "https://cloud.enterprise.io/portal",
      body: "Dynamic DNS resolver handoff. Pointed to latest staging deployment without altering printed collateral.",
      actionText: "Open Destination Now →",
    },
  },
  {
    id: "secret",
    name: "Server Master Key Recovery",
    type: "text",
    badge: "Argon2id Secret",
    icon: Lock,
    headline: "Password-Gated Confidential Memo",
    summary: "Protected by Argon2id cryptographic password verification",
    metadata: {
      size: "1.4 KB Encrypted Note",
      security: "Argon2id Hash Key",
      expiry: "Self-Destruct on Access",
      token: "tok_vault_90e3f",
    },
    payload: "https://qrcontent.io/r/tok_vault_90e3f",
    viewerPreview: {
      title: "Protected Memo Unlocked",
      subtitle: "Argon2id Session Validated ✓",
      body: "WIFI: Enterprise-Secure-5G\nPASS: x9#K29!vL00-pQ9\nRESTRICTED: Do not distribute beyond authorized engineering staff.",
      actionText: "Copy Secret Text",
    },
  },
  {
    id: "bundle",
    name: "Press Kit & Brand Assets",
    type: "bundle",
    badge: "Asset Bundle",
    icon: FolderArchive,
    headline: "Multi-file grouped digital package",
    summary: "5 High-Res Logos, Color Palette Spec, and Brand PDF",
    metadata: {
      size: "18.4 MB (5 Assets)",
      security: "Public Read-Only",
      expiry: "Permanent Active",
      token: "tok_press_66b7c",
    },
    payload: "https://qrcontent.io/r/tok_press_66b7c",
    viewerPreview: {
      title: "Press Kit & Brand Assets",
      subtitle: "5 Files · 18.4 MB Total Package",
      body: "• Logo_Mark_Vector.svg (120 KB)\n• Brand_Guidelines_2026.pdf (12.4 MB)\n• Hero_Press_Photos.zip (5.8 MB)",
      actionText: "Download Complete Bundle",
    },
  },
];

export function HeroSynthesisEngine() {
  const [activePreset, setActivePreset] = useState<ContentPreset>(PRESETS[0]);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"qr" | "phone">("qr");
  const [scansSimulated, setScansSimulated] = useState<number>(318);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setIsSynthesizing(true);

    const timer = setTimeout(async () => {
      try {
        const dataUrl = await QRCode.toDataURL(activePreset.payload, {
          width: 340,
          margin: 1,
          color: {
            dark: "#020617",
            light: "#ffffff",
          },
          errorCorrectionLevel: "H",
        });
        if (isMounted) {
          setQrDataUrl(dataUrl);
          setIsSynthesizing(false);
        }
      } catch (err) {
        if (isMounted) setIsSynthesizing(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [activePreset]);

  function handleCopy() {
    navigator.clipboard.writeText(activePreset.payload);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }

  function handleScanSimulation() {
    setScansSimulated((prev) => prev + 1);
    setActiveTab("phone");
  }

  return (
    <div className="relative mx-auto w-full max-w-5xl rounded-3xl border border-slate-800 bg-slate-900/90 p-4 sm:p-8 shadow-2xl backdrop-blur-2xl">
      {/* Top Telemetry Station Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-500"></span>
          </span>
          <span className="font-bold text-white uppercase tracking-wider">
            SYNTHESIS ENGINE & LIVE SIMULATOR
          </span>
          <span className="hidden md:inline text-slate-700">|</span>
          <span className="hidden md:inline text-emerald-400 font-bold">
            LATENCY: 14ms
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("qr")}
              className={`rounded-md px-3 py-1 text-xs font-mono transition-colors ${
                activeTab === "qr"
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              QR Synthesis
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("phone")}
              className={`rounded-md px-3 py-1 text-xs font-mono transition-colors ${
                activeTab === "phone"
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Mobile Viewer Simulation
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
        {/* Left Column: Interactive Payload Selector */}
        <div className="space-y-4 lg:col-span-7">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-mono text-cyan-300">
              <Sparkles className="h-3 w-3" />
              Dynamic Content Ingestion
            </span>
            <h3 className="mt-2 text-xl sm:text-2xl font-bold text-white tracking-tight">
              One Immutable QR. Any Digital Asset.
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Select a sample payload to watch the dynamic resolver assemble the access portal in real time:
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PRESETS.map((preset) => {
              const Icon = preset.icon;
              const isSelected = activePreset.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setActivePreset(preset);
                  }}
                  className={`group flex flex-col rounded-2xl border p-4 text-left transition-all ${
                    isSelected
                      ? "border-cyan-500 bg-cyan-950/40 text-white shadow-xl shadow-cyan-950/60 ring-1 ring-cyan-500/40"
                      : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`p-2 rounded-xl transition-colors ${
                        isSelected
                          ? "bg-cyan-500 text-slate-950 font-bold"
                          : "bg-slate-800 text-slate-300 group-hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-slate-800 bg-slate-950 text-slate-400">
                      {preset.badge}
                    </span>
                  </div>

                  <div className="mt-3 font-semibold text-sm text-white truncate">
                    {preset.name}
                  </div>
                  <div className="text-xs text-slate-400 truncate mt-0.5">
                    {preset.headline}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Telemetry Inspector Box */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs text-slate-400 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-slate-300 font-bold">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                TELEMETRY & CRYPTOGRAPHY METRICS
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                TOKEN: {activePreset.metadata.token}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
              <div>
                Asset Size: <span className="text-white">{activePreset.metadata.size}</span>
              </div>
              <div>
                Security: <span className="text-emerald-400">{activePreset.metadata.security}</span>
              </div>
              <div>
                Lifespan: <span className="text-amber-300">{activePreset.metadata.expiry}</span>
              </div>
              <div>
                Simulated Scans: <span className="text-cyan-400 font-bold">{scansSimulated}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live View (QR Mode OR Phone Mockup Mode) */}
        <div className="lg:col-span-5">
          {activeTab === "qr" ? (
            /* QR Matrix Canvas */
            <div className="relative mx-auto max-w-xs rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  MINTED RESOLVER
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                  ECC LEVEL H
                </span>
              </div>

              {/* QR Image Frame */}
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-white p-4 shadow-inner flex items-center justify-center">
                {qrDataUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrDataUrl}
                      alt="Synthesized dynamic QR code"
                      className={`h-full w-full object-contain transition-opacity duration-300 ${
                        isSynthesizing ? "opacity-30 blur-sm" : "opacity-100"
                      }`}
                    />
                    {/* Laser scan line */}
                    <div className="pointer-events-none absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_12px_#06b6d4] animate-scan-line" />
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                    <span>Synthesizing Matrix…</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleScanSimulation}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3 text-xs font-bold text-slate-950 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98]"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Simulate Phone Scan</span>
                  <ArrowRight className="h-3 w-3" />
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-900 py-2 text-[11px] font-mono font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    {isCopied ? "Copied URL ✓" : "Copy Resolver Link"}
                  </button>
                  <Link
                    href="/signup"
                    className="flex items-center justify-center gap-1 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-[11px] font-mono font-bold text-cyan-300 hover:bg-cyan-500/20"
                  >
                    Mint Real QR
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* Mobile Device Simulator */
            <div className="relative mx-auto max-w-[290px] rounded-[36px] border-4 border-slate-700 bg-slate-950 p-4 shadow-2xl space-y-3">
              {/* Phone Speaker Notch */}
              <div className="mx-auto h-3.5 w-20 rounded-full bg-slate-800" />

              {/* Simulated Mobile Browser Screen */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left space-y-3 min-h-[310px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">
                      RESOLVER READY
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400">
                      TLS 1.3 SECURE
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="text-xs font-bold text-white leading-tight">
                      {activePreset.viewerPreview.title}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {activePreset.viewerPreview.subtitle}
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-2.5 font-mono text-[10px] text-slate-300 whitespace-pre-line leading-relaxed">
                    {activePreset.viewerPreview.body}
                  </div>
                </div>

                {activePreset.viewerPreview.actionText && (
                  <button
                    type="button"
                    onClick={() => {
                      alert(`Simulation action triggered: ${activePreset.viewerPreview.actionText}`);
                    }}
                    className="w-full rounded-xl bg-cyan-500 py-2 text-[11px] font-bold text-slate-950 hover:bg-cyan-400 transition-colors text-center"
                  >
                    {activePreset.viewerPreview.actionText}
                  </button>
                )}
              </div>

              {/* Bottom Phone Bar */}
              <button
                type="button"
                onClick={() => setActiveTab("qr")}
                className="w-full text-center text-[10px] font-mono text-cyan-400 hover:underline pt-1"
              >
                ← Return to QR Matrix View
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
