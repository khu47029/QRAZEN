import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { getFullQrDataForOwner } from "@/lib/queries";
import { buildResolverUrl, generateQrPng } from "@/lib/qr-generator";
import { QrDetail } from "@/components/dashboard/qr-detail";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function QrDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) return null;

  const data = await getFullQrDataForOwner(id, user.id);
  if (!data) notFound();

  const resolverUrl = buildResolverUrl(data.qrCode.publicToken);
  const qrPng = await generateQrPng(resolverUrl, { width: 320 });

  const rules = data.accessRules;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Gateway Workstation
        </Link>
      </div>

      <QrDetail
        qr={{
          id: data.qrCode.id,
          name: data.qrCode.name,
          contentType: data.qrCode.contentType,
          status: data.qrCode.status,
          expiresAt: data.qrCode.expiresAt,
          createdAt: data.qrCode.createdAt,
          currentContentVersionId: data.qrCode.currentContentVersionId,
        }}
        rules={{
          visibility: rules?.visibility ?? "public",
          allowDownload: rules?.allowDownload ?? true,
          viewOnly: rules?.viewOnly ?? false,
          hasPassword: !!rules?.passwordHash,
        }}
        versionNumber={data.currentVersion?.versionNumber ?? 1}
        files={data.files.map((f) => ({
          id: f.id,
          originalFilename: f.originalFilename,
          mimeType: f.mimeType,
          sizeBytes: f.sizeBytes,
        }))}
        textBody={data.textBody}
        targetUrl={data.targetUrl}
        resolverUrl={resolverUrl}
        qrPngDataUrl={qrPng}
      />
    </main>
  );
}
