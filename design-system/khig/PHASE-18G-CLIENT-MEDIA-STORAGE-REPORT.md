# Phase 18G — Client Review Media Storage Report

**Edition:** KXD OS Edition 1  
**Phase:** 18G — Client Review Media Storage Foundation  
**Status:** Complete

---

## Previous Limitation

Website Review attachments used Payload’s native upload configuration on `client-review-media`, writing files to `private/client-review-media` on the local filesystem.

That pattern works in local development but is **not production-reliable on Vercel**:

- Serverless functions have ephemeral, read-only filesystems
- Uploaded files do not persist across deployments or instances
- Attachment serve routes read directly from disk, so production users could upload successfully yet fail to retrieve files later

Phase 18F identified this as the primary production readiness blocker for Website Review.

---

## Architecture Solution

A small **storage abstraction layer** decouples application code from the underlying provider.

```
Portal upload API
       ↓
getDefaultClientReviewStorageAdapter()
       ↓
  local | vercel-blob adapter
       ↓
Persistent object store
       ↓
Payload metadata record (client, mime, storageKey, storageProvider)
       ↓
Portal / Admin serve APIs (session or admin auth)
```

### Components

| Path | Role |
|------|------|
| `lib/client-review-media/storage/types.ts` | Adapter interface |
| `lib/client-review-media/storage/local.ts` | Dev / fallback filesystem adapter |
| `lib/client-review-media/storage/vercel-blob.ts` | Production Vercel Blob adapter |
| `lib/client-review-media/storage/resolve.ts` | Provider selection |
| `lib/client-review-media/record.ts` | Parse storage ref from Payload docs |
| `lib/client-review-media/serve.ts` | Open attachment stream |
| `lib/client-review-media/delete-object.ts` | Delete binary on record removal |

### Provider selection

- **Production:** When `BLOB_READ_WRITE_TOKEN` is set, uploads use **Vercel Blob** (`access: 'private'`).
- **Development:** Without the token, uploads use the **local filesystem** under `private/client-review-media/`.

Reads always use the **record’s `storageProvider`**, so legacy local files and new blob objects coexist during migration.

### Payload collection

`client-review-media` is now a **metadata collection** (no Payload `upload` block). Binary content is managed exclusively through the storage adapters. Fields added:

- `storageProvider` — `local` | `vercel-blob`
- `storageKey` — provider object key
- `mimeType`, `filesize` — explicit metadata

Legacy `filename` is retained for pre-18G rows.

---

## Storage Flow

### Upload

1. Portal session validated (`POST /api/portal/website-review/upload`)
2. MIME type and 10 MB size validated (unchanged)
3. Adapter uploads buffer → returns `storageKey`
4. Payload record created with client scope + storage metadata
5. On Payload failure, uploaded object is rolled back

### Retrieval

1. Portal or admin route loads Payload record by ID
2. **Portal:** client ID must match session (unchanged boundary)
3. **Admin:** Payload admin auth required (unchanged)
4. `openClientReviewMedia()` resolves adapter from `storageProvider` and streams content
5. Files are **never** exposed via public URLs; all delivery is authenticated API routes

### Delete

- Portal pre-submit delete and admin revision delete call `deleteClientReviewMediaObject()` before removing the Payload record

---

## Security

| Control | Implementation |
|---------|----------------|
| Client isolation | Portal serve + upload/delete verify `session.clientId` |
| Admin access | Review inbox serve requires Payload admin |
| No public blob URLs | Vercel Blob `access: 'private'`; serve through APIs only |
| File type validation | Existing `isWebsiteReviewMimeAllowed()` unchanged |
| Size limits | Existing 10 MB cap unchanged |
| Path traversal | Local adapter resolves keys within `private/client-review-media` root |

---

## Files Changed

### Created

- `lib/client-review-media/` — storage abstraction (types, local, vercel-blob, resolve, record, serve, delete)
- `migrations/20260726_phase18g_client_review_media_storage.ts`
- `design-system/khig/PHASE-18G-CLIENT-MEDIA-STORAGE-REPORT.md`

### Modified

- `payload/collections/ClientReviewMedia.ts` — metadata-only collection
- `app/api/portal/website-review/upload/route.ts` — adapter upload + rollback
- `app/api/portal/website-review/attachments/[id]/route.ts` — adapter serve
- `lib/website-review-inbox/serve-attachment.ts` — adapter serve
- `lib/website-review-inbox/delete.ts` — storage cleanup on revision delete
- `migrations/index.ts` — register 18G migration
- `package.json` / `package-lock.json` — `@vercel/blob`

### Unchanged (by design)

- Website Review UI / workflow
- Attachment validation rules
- Intelligence systems (Observer, Brain, Pulse, etc.)
- Portal session model

---

## Production Impact

### Before 18G

- Attachments unreliable on Vercel after upload
- Production launch blocked for Website Review media

### After 18G

- Durable private blob storage when `BLOB_READ_WRITE_TOKEN` is configured
- Local dev unchanged (no token required)
- Backward compatible with existing local dev attachments via legacy `filename` fallback

### Production checklist

1. Create a Vercel Blob store for the project
2. Set `BLOB_READ_WRITE_TOKEN` in Vercel environment variables
3. Run `npm run migrate` to add `storage_provider` / `storage_key` columns
4. Redeploy

---

## Future Provider Flexibility

The `ClientReviewStorageAdapter` interface supports additional providers (S3, R2, GCS) without changing portal or admin routes:

1. Implement adapter in `lib/client-review-media/storage/`
2. Add provider value to collection `storageProvider` select
3. Register in `getClientReviewStorageAdapter()`

Application routes and Website Review workflow remain provider-agnostic.

---

## Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Persistent storage solution ready | ✅ Vercel Blob + local fallback |
| Works for all clients | ✅ Client-scoped keys, no Primal-specific code |
| Website Review workflow preserved | ✅ Same APIs and UX |
| No intelligence changes | ✅ None touched |
| TypeScript clean | ✅ Verified via build |
| `npm run build` passes | ✅ See build output |
