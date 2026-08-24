#!/usr/bin/env node
import "./load-env-local.mjs";

const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
const key =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "vndrly-objects";
const fileSizeLimit = Number(
  process.env.SUPABASE_STORAGE_MAX_UPLOAD_BYTES || 25 * 1024 * 1024,
);

if (!url || !key) {
  throw new Error(
    "Missing SUPABASE_URL and server-only SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.",
  );
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

const existingResponse = await fetch(
  `${url}/storage/v1/bucket/${encodeURIComponent(bucket)}`,
  { headers },
);

if (existingResponse.ok) {
  const existing = await existingResponse.json();
  if (existing.public !== false) {
    throw new Error(`Supabase Storage bucket ${bucket} exists but is not private.`);
  }
  console.log(`Supabase Storage bucket ${bucket} already exists and is private.`);
} else {
  const existingError = await existingResponse.json().catch(() => ({}));
  const bucketMissing =
    existingResponse.status === 404 ||
    (existingResponse.status === 400 &&
      /bucket not found/i.test(
        String(existingError.error || existingError.message || ""),
      ));

  if (!bucketMissing) {
    throw new Error(
      `Could not inspect Supabase Storage bucket ${bucket} (${existingResponse.status}).`,
    );
  }

  const createResponse = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      id: bucket,
      name: bucket,
      public: false,
      file_size_limit: fileSizeLimit,
    }),
  });

  if (!createResponse.ok) {
    throw new Error(
      `Could not create Supabase Storage bucket ${bucket} (${createResponse.status}).`,
    );
  }

  console.log(`Created private Supabase Storage bucket ${bucket}.`);
}
