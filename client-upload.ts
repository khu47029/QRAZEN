/**
 * Client-side upload orchestration shared by the create and replace-content
 * flows. Runs entirely in the browser; imports nothing server-side.
 *
 * The three-step handshake (presign → PUT → complete) mirrors a real S3/R2
 * direct upload so swapping local storage for a bucket needs no client change:
 *   1. ask the server for a destination and storage key
 *   2. PUT the bytes straight there
 *   3. tell the server to verify magic bytes and register the file
 */

// Browsers sometimes report an empty or generic type (notably for .zip). Fall
// back to the extension so the server's MIME allow-list still recognises it.
const EXT_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  zip: "application/zip",
};

export function resolveMimeType(file: File): string {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MIME[ext] ?? file.type ?? "application/octet-stream";
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Uploads one file and registers it against a content version.
 * Throws with a human-readable message on any failed step.
 */
export async function uploadFile(
  file: File,
  qrCodeId: string,
  contentVersionId: string
): Promise<void> {
  const mimeType = resolveMimeType(file);

  const presignRes = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      qrCodeId,
      contentVersionId,
      filename: file.name,
      mimeType,
      sizeBytes: file.size,
    }),
  });
  if (!presignRes.ok) {
    throw new Error(await errorMessage(presignRes, `Could not prepare "${file.name}".`));
  }

  const { uploadUrl, storageKey, headers } = await presignRes.json();

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType, ...(headers ?? {}) },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(await errorMessage(putRes, `Upload of "${file.name}" failed.`));
  }

  const completeRes = await fetch("/api/uploads/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storageKey,
      contentVersionId,
      qrCodeId,
      originalFilename: file.name,
      mimeType,
      sizeBytes: file.size,
    }),
  });
  if (!completeRes.ok) {
    throw new Error(
      await errorMessage(completeRes, `"${file.name}" was rejected during verification.`)
    );
  }
}

/** Uploads files sequentially so one clear error surfaces instead of a race. */
export async function uploadFiles(
  files: File[],
  qrCodeId: string,
  contentVersionId: string,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  for (let i = 0; i < files.length; i++) {
    await uploadFile(files[i], qrCodeId, contentVersionId);
    onProgress?.(i + 1, files.length);
  }
}
