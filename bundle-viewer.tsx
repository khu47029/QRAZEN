import { formatBytes } from "@/lib/utils";
import { Layers, Download, FileText, Image as ImageIcon, FolderArchive, File, ExternalLink } from "lucide-react";

interface BundleFile {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  zipManifestJson?: string | null;
}

interface Props {
  files: BundleFile[];
  allowDownload: boolean;
}

function getIconForMime(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime === "application/pdf") return FileText;
  if (mime.includes("zip")) return FolderArchive;
  return File;
}

export function BundleViewer({ files, allowDownload }: Props) {
  if (files.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl p-12 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-500">
          <Layers className="h-6 w-6" />
        </div>
        <p className="text-xs font-mono text-slate-400">This bundle payload is currently empty.</p>
      </div>
    );
  }

  const totalBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0);

  return (
    <div className="space-y-4">
      <div className="px-2 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">
            Multi-Asset Bundle
          </h1>
          <p className="text-xs font-mono text-slate-400">
            {files.length} items · {formatBytes(totalBytes)} total payload
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {files.map((file) => {
          const Icon = getIconForMime(file.mimeType);
          const isImage = file.mimeType.startsWith("image/");
          const isPdf = file.mimeType === "application/pdf";

          return (
            <div
              key={file.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden"
            >
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-cyan-400 flex-shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate font-mono">
                      {file.filename}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {formatBytes(file.sizeBytes)} · {file.mimeType}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isPdf && (
                    <a
                      href={`/api/serve/${file.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-1 text-[11px] font-mono text-slate-300 hover:text-white"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>View</span>
                    </a>
                  )}

                  {allowDownload && (
                    <a
                      href={`/api/serve/${file.id}?download=1`}
                      className="inline-flex items-center gap-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 text-[11px] font-mono font-semibold text-cyan-300 hover:bg-cyan-500/20"
                      download={file.filename}
                    >
                      <Download className="h-3 w-3" />
                      <span>Download</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Inline preview for images */}
              {isImage && (
                <div className="border-t border-slate-800 bg-slate-950 flex items-center justify-center p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/serve/${file.id}`}
                    alt={file.filename}
                    className="max-w-full rounded-xl max-h-[35vh] object-contain"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!allowDownload && (
        <p className="text-center text-[10px] font-mono text-slate-500 pt-2">
          File downloads disabled by content owner.
        </p>
      )}
    </div>
  );
}
