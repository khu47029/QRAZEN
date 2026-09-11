import crypto from "crypto";
import { sanitizeFilename } from "./utils";

export interface StorageObjectMetadata {
  storageKey: string;
  sizeBytes: number;
  mimeType: string;
  checksum: string;
}

export interface PresignedUploadUrlResponse {
  uploadUrl: string;
  storageKey: string;
  expiresInSeconds: number;
  headers?: Record<string, string>;
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;

  if (!url || !key || !bucket) {
    throw new Error(
      "Supabase Storage is not configured. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_STORAGE_BUCKET."
    );
  }

  return { url, key, bucket };
}

function getObjectUrl(storageKey: string): string {
  const { url, bucket } = getSupabaseConfig();

  const encodedBucket = encodeURIComponent(bucket);
  const encodedKey = storageKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${url}/storage/v1/object/${encodedBucket}/${encodedKey}`;
}

function getHeaders(contentType?: string): Record<string, string> {
  const { key } = getSupabaseConfig();

  return {
    Authorization: `Bearer ${key}`,
    apikey: key,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

export function isValidStorageKey(storageKey: string): boolean {
  return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f]{8}-[a-zA-Z0-9._-]{1,100}$/.test(
    storageKey
  );
}

export function buildStorageKey(
  ownerId: string,
  qrCodeId: string,
  versionId: string,
  originalFilename: string
): string {
  const shortHash = crypto.randomBytes(4).toString("hex");
  const cleanName = sanitizeFilename(originalFilename);

  return `${ownerId}/${qrCodeId}/${versionId}/${shortHash}-${cleanName}`;
}

export async function getPresignedUploadUrl(
  storageKey: string,
  declaredMime: string,
  maxSizeBytes: number,
  expiresInSeconds = 300
): Promise<PresignedUploadUrlResponse> {
  getSupabaseConfig();

  return {
    uploadUrl: `/api/uploads/direct?key=${encodeURIComponent(storageKey)}`,
    storageKey,
    expiresInSeconds,
    headers: {
      "Content-Type": declaredMime,
    },
  };
}

export async function putObject(
  storageKey: string,
  buffer: Buffer,
  mimeType: string
): Promise<StorageObjectMetadata> {
  const response = await fetch(getObjectUrl(storageKey), {
    method: "POST",
    headers: {
      ...getHeaders(mimeType),
      "x-upsert": "true",
    },
    body: buffer as unknown as BodyInit,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Supabase Storage upload failed (${response.status}): ${errorText}`
    );
  }

  const checksum = crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");

  return {
    storageKey,
    sizeBytes: buffer.length,
    mimeType,
    checksum,
  };
}

export async function getObject(
  storageKey: string
): Promise<Buffer | null> {
  const response = await fetch(getObjectUrl(storageKey), {
    method: "GET",
    headers: getHeaders(),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Supabase Storage download failed (${response.status}): ${errorText}`
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function deleteObject(
  storageKey: string
): Promise<boolean> {
  const response = await fetch(getObjectUrl(storageKey), {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (response.status === 404) {
    return false;
  }

  if (!response.ok) {
    return false;
  }

  return true;
    }
