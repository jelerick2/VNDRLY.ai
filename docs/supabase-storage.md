# Supabase Storage setup and Replit migration plan

VNDRLY uses Supabase Storage only from the API server. Browser and mobile
clients upload through short-lived, HMAC-signed `/api/storage/upload/...` URLs;
they never receive Supabase credentials or connect directly to the bucket.
The service-role key must never be placed in a `VITE_*` or `EXPO_PUBLIC_*`
variable.

## Setup

Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and
`SUPABASE_STORAGE_BUCKET=vndrly-objects` in each machine's `.env.local` and in
the deployment secret store. `SUPABASE_STORAGE_MAX_UPLOAD_BYTES` is optional
and defaults to 25 MiB. The API creates the named bucket as private if it does
not exist; no browser-facing Storage policies are required.

Files live in one private bucket. ACL metadata is stored beside each file as an
`.acl.json` sidecar, and every read passes through VNDRLY's authorization-aware
API. Intentional public branding assets use the `public/` prefix but are still
served by the API. Local development falls back to `.local/object-storage`
when server credentials are absent.

## Existing Replit object inventory and transfer

Do not delete or move Replit objects until source and destination are confirmed.

1. Export a read-only Replit inventory: bucket/path, size, content type,
   checksum or ETag, and public/private classification.
2. Inventory database values containing `/objects/`,
   `/api/storage/objects/`, and public-object URLs, including row/table IDs.
3. Classify objects. User uploads, certifications, receipts, comments, and
   ticket photos belong in private; intentional branding assets may be public.
4. Copy without deleting the source. Preserve names after the bucket prefix so
   existing `/objects/...` values continue to resolve.
5. Create `.acl.json` sidecars for legacy objects with verified ownership.
   Hold ambiguous ownership for manual review.
6. Compare counts, bytes, and checksums; test authorized, denied, and public
   reads. Observe one release cycle before separately authorizing cleanup.

No live inventory or transfer is performed by this repository change.

## Upload safety

The API enforces the configured byte limit and uses UUID object names to avoid
client-controlled paths. Add content inspection or malware scanning before
production acceptance of untrusted compliance documents if policy requires it.
