"use client";

import { useState } from "react";
import { Image as ImageIcon, Download, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";

interface FileItem {
  id: string;
  filename: string;
}

interface Props {
  files: FileItem[];
  allowDownload: boolean;
}

export function ImageGallery({ files, allowDownload }: Props) {
  const [selected, setSelected] = useState<number>(0);

  if (files.length === 0) return null;

  const current = files[selected];

  function prevImage() {
    setSelected((prev) => (prev > 0 ? prev - 1 : files.length - 1));
  }

  function nextImage() {
    setSelected((prev) => (prev < files.length - 1 ? prev + 1 : 0));
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-slate-800 text-cyan-400 flex-shrink-0">
            <ImageIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono truncate">
              {files.length === 1 ? current?.filename : `Image Gallery (${selected + 1}/${files.length})`}
            </h2>
            <div className="text-[11px] text-slate-400 font-mono truncate">
              {current?.filename}
            </div>
          </div>
        </div>

        {allowDownload && current && (
          <a
            href={`/api/serve/${current.id}?download=1`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 text-xs font-mono font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-colors flex-shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download</span>
          </a>
        )}
      </div>

      {/* Main Image Stage */}
      {current && (
        <div className="relative bg-slate-950 flex items-center justify-center p-4 min-h-[360px] max-h-[75vh]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/serve/${current.id}`}
            alt={current.filename}
            className="max-w-full max-h-[70vh] rounded-xl object-contain shadow-2xl"
          />

          {/* Previous / Next Overlays if multiple */}
          {files.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 border border-slate-800 text-white hover:bg-slate-800 transition-all backdrop-blur-sm"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 border border-slate-800 text-white hover:bg-slate-800 transition-all backdrop-blur-sm"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Thumbnails strip */}
      {files.length > 1 && (
        <div className="px-4 py-3 flex gap-2.5 overflow-x-auto border-t border-slate-800 bg-slate-950/60">
          {files.map((f, i) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelected(i)}
              className={`flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                i === selected
                  ? "border-cyan-500 ring-2 ring-cyan-500/20 scale-105"
                  : "border-slate-800 opacity-60 hover:opacity-100"
              }`}
              aria-label={`View ${f.filename}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/serve/${f.id}`}
                alt={f.filename}
                className="w-16 h-16 object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
