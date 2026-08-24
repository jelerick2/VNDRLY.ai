import * as ImagePicker from "expo-image-picker";

import { apiFetch, getApiBase } from "./api";

export type UploadResult = {
  objectPath: string;
  contentType: string;
  size: number;
};

function resolveUploadUrl(uploadURL: string): string {
  if (/^https?:\/\//i.test(uploadURL)) return uploadURL;
  const base = getApiBase().replace(/\/$/, "");
  return `${base}${uploadURL.startsWith("/") ? uploadURL : `/${uploadURL}`}`;
}

export async function pickAndUploadImage(): Promise<UploadResult | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== "granted") {
    throw new Error("Photo library permission denied");
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.6,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return uploadAsset(result.assets[0]);
}

export async function captureAndUploadImage(options?: { maxBytes?: number; purpose?: "gate-evidence" }): Promise<UploadResult | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (perm.status !== "granted") {
    throw new Error("Camera permission denied");
  }
  const result = await ImagePicker.launchCameraAsync({
    quality: 0.6,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return uploadAsset(result.assets[0], options?.maxBytes, options?.purpose);
}

async function uploadAsset(
  asset: ImagePicker.ImagePickerAsset,
  maxBytes?: number,
  purpose?: "gate-evidence",
): Promise<UploadResult> {
  const contentType = asset.mimeType || "image/jpeg";
  const name = asset.fileName || `photo-${Date.now()}.jpg`;

  const blob = await fetch(asset.uri).then((r) => r.blob());
  const size = blob.size || asset.fileSize || 0;
  if (maxBytes && size > maxBytes) {
    throw new Error(`Photo is too large to upload. Use an image smaller than ${Math.floor(maxBytes / (1024 * 1024))} MB.`);
  }

  const presigned = await apiFetch<{ uploadURL: string; objectPath: string }>(
    "/api/storage/uploads/request-url",
    {
      method: "POST",
      body: JSON.stringify({ name, size, contentType }),
    },
  );

  const putUrl = resolveUploadUrl(presigned.uploadURL);
  const putRes = await fetch(putUrl, {
    method: "PUT",
    headers: { "content-type": contentType },
    body: blob,
  });
  if (!putRes.ok) {
    if (putRes.status === 413) {
      throw new Error(
        "Photo is too large to upload. Try again or pick a smaller image from your library.",
      );
    }
    throw new Error(`Upload failed (HTTP ${putRes.status})`);
  }

  await apiFetch("/api/storage/uploads/finalize", {
    method: "POST",
    body: JSON.stringify({
      objectURL: presigned.uploadURL,
      visibility: "private",
      ...(purpose ? { purpose } : {}),
    }),
  });

  return { objectPath: presigned.objectPath, contentType, size };
}
