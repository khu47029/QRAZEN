import { notFound, redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { getQrByToken, recordScan } from "@/lib/queries";
import { verifyViewerSessionToken, hashIpDaily } from "@/lib/crypto";
import { detectDeviceType, detectBrowserFamily } from "@/lib/session";
import { PasswordGate } from "@/components/viewer/password-gate";
import { TextViewer } from "@/components/viewer/text-viewer";
import { ImageGallery } from "@/components/viewer/image-gallery";
import { PdfViewer } from "@/components/viewer/pdf-viewer";
import { ZipManifestViewer } from "@/components/viewer/zip-manifest-viewer";
import { BundleViewer } from "@/components/viewer/bundle-viewer";
import { AbuseReportButton } from "@/components/viewer/abuse-report-button";
import { ShieldCheck, Clock, Trash2, PowerOff, Sparkles, AlertCircle, Eye } from "lucide-react";
import { QrazenLogo } from "@/components/brand/qrazen-logo";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ResolverPage({ params }: Props) {
  const { token } = await params;

  if (!token || token.length > 64) notFound();

  const data = await getQrByToken(token);
  if (!data) notFound();

  const { qrCode, accessRules, currentVersion, files, textBody, targetUrl } = data;

  // ── Status gates ──────────────────────────────────────────────────────────
  if (qrCode.status === "deleted") {
    return <RemovedPage />;
  }

  if (qrCode.status === "expired") {
    return <ExpiredPage />;
  }

  if (qrCode.status === "disabled") {
    return <DisabledPage />;
  }

  // ── Password check ────────────────────────────────────────────────────────
  const isPasswordProtected = accessRules?.visibility === "password";
  let hasValidSession = false;

  if (isPasswordProtected) {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(`qr_viewer_${qrCode.id}`)?.value;
    hasValidSession = verifyViewerSessionToken(sessionToken, qrCode.id);
  }

  // ── Record the scan (privacy-first) ──────────────────────────────────────
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "";
  const forwardedFor = headersList.get("x-forwarded-for") || "";
  const ip = forwardedFor.split(",")[0]?.trim() || "unknown";

  if (!isPasswordProtected || hasValidSession) {
    recordScan(qrCode.id, {
      deviceType: detectDeviceType(userAgent),
      browserFamily: detectBrowserFamily(userAgent),
      sessionHash: ip !== "unknown" ? hashIpDaily(ip) : undefined,
    }).catch(() => {});
  }

  // ── Password gate ─────────────────────────────────────────────────────────
  if (isPasswordProtected && !hasValidSession) {
    return (
      <ViewerShell qrCodeId={qrCode.id}>
        <PasswordGate qrCodeId={qrCode.id} token={token} />
      </ViewerShell>
    );
  }

  // ── URL redirect ──────────────────────────────────────────────────────────
  if (qrCode.contentType === "url" && targetUrl) {
    redirect(targetUrl);
  }

  const allowDownload = accessRules?.allowDownload ?? true;
  const viewOnly = accessRules?.viewOnly ?? false;

  const hasContent =
    (qrCode.contentType === "text" && !!textBody) ||
    (qrCode.contentType === "url" && !!targetUrl) ||
    files.length > 0;

  if (!hasContent) {
    return <NoContentPage />;
  }

  // ── Content rendering ─────────────────────────────────────────────────────
  return (
    <ViewerShell qrCodeId={qrCode.id}>
      {viewOnly && (
        <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-950/30 px-4 py-2.5 text-center text-xs font-mono text-amber-300 flex items-center justify-center gap-2">
          <Eye className="h-3.5 w-3.5 flex-shrink-0" />
          <span>View-only sandbox mode enabled. Direct binary downloads are restricted.</span>
        </div>
      )}

      {qrCode.contentType === "text" && textBody && (
        <TextViewer text={textBody} />
      )}

      {qrCode.contentType === "pdf" && files[0] && (
        <PdfViewer
          fileId={files[0].id}
          filename={files[0].originalFilename}
          allowDownload={allowDownload}
        />
      )}

      {qrCode.contentType === "image" && (
        <ImageGallery
          files={files.map((f) => ({ id: f.id, filename: f.originalFilename }))}
          allowDownload={allowDownload}
        />
      )}

      {qrCode.contentType === "zip" && files[0] && (
        <ZipManifestViewer
          fileId={files[0].id}
          filename={files[0].originalFilename}
          manifestJson={files[0].zipManifestJson}
          allowDownload={allowDownload}
        />
      )}

      {qrCode.contentType === "multi" && (
        <BundleViewer
          files={files.map((f) => ({
            id: f.id,
            filename: f.originalFilename,
            mimeType: f.mimeType,
            sizeBytes: f.sizeBytes,
            zipManifestJson: f.zipManifestJson,
          }))}
          allowDownload={allowDownload}
        />
      )}
    </ViewerShell>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

function ViewerShell({
  qrCodeId,
  children,
}: {
  qrCodeId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Subtle top brand pill */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-900">
        <QrazenLogo variant="compact" />
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          VERIFIED TOKEN
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 flex-1">{children}</main>

      <footer className="pb-8 pt-4 text-center space-y-2 border-t border-slate-900">
        <AbuseReportButton qrCodeId={qrCodeId} />
        <p className="text-[11px] font-mono text-slate-600">
          Delivered securely by QRAZEN Infrastructure
        </p>
      </footer>
    </div>
  );
}

// ─── Status Pages ─────────────────────────────────────────────────────────────

function ExpiredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 text-center">
      <div className="max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
          <Clock className="h-8 w-8" />
        </div>
        <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-semibold">
          ACCESS LIFESPAN TERMINATED
        </span>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-1 mb-2">
          Content Has Expired
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          The owner of this dynamic QR gateway set a scheduled expiration date which has now passed. Access to this content payload is no longer served.
        </p>
      </div>
    </div>
  );
}

function RemovedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 text-center">
      <div className="max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400">
          <Trash2 className="h-8 w-8" />
        </div>
        <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest font-semibold">
          GATEWAY REVOKED
        </span>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-1 mb-2">
          Content Removed
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          The owner has permanently removed the content associated with this dynamic token.
        </p>
      </div>
    </div>
  );
}

function DisabledPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 text-center">
      <div className="max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-slate-400 border border-slate-700">
          <PowerOff className="h-8 w-8" />
        </div>
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-semibold">
          GATEWAY TEMPORARILY DISABLED
        </span>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-1 mb-2">
          Access Suspended
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          This dynamic QR gateway is temporarily paused by its owner. It may become accessible again once reactivated.
        </p>
      </div>
    </div>
  );
}

function NoContentPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 text-center">
      <div className="max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
          <Sparkles className="h-8 w-8" />
        </div>
        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">
          CONTENT IN ROTATION
        </span>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-1 mb-2">
          Payload Updating
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          The owner is currently rotating or publishing a new payload for this dynamic code. Please check back in a moment.
        </p>
      </div>
    </div>
  );
}
