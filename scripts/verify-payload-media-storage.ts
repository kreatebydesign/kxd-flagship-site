/**
 * Payload Media durable storage — source + policy regression.
 * Run: npm run verify:payload-media-storage
 *
 * Does not upload, import OTP, activate CES, or write production data.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { bundledPublicMediaSrc, BUNDLED_PUBLIC_MEDIA_PATHS } from "../lib/media/bundled-public-media.ts";
import {
  explainPayloadMediaUploadFailure,
  generatePayloadMediaFileUrl,
  isDurablePayloadMediaUrl,
  payloadMediaBlobToken,
  requireDurablePayloadMedia,
  shouldEnablePayloadMediaBlobStorage,
  vercelBlobPublicBaseUrlFromToken,
} from "../lib/media/payload-storage.ts";
import { resolveMediaPath, toAbsoluteMediaUrl } from "../lib/inventory/media.ts";
import { prepareManagedLogoUpload } from "../lib/client-command/experience/composer/import-logo.ts";
import { resolveMediaAssetUrl } from "../lib/client-command/experience/media-url.ts";

const root = process.cwd();
let failed = 0;

function check(label: string, pass: boolean) {
  console.log(pass ? `  ✔ ${label}` : `  ✗ ${label}`);
  if (!pass) failed += 1;
}

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function walkPublicMedia(dir: string, base = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walkPublicMedia(path.join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out.sort();
}

function withEnv(patch: Record<string, string | undefined>, fn: () => void): void {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(patch)) {
    previous[key] = process.env[key];
    const value = patch[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(patch)) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function main() {
  console.log("\nPayload Media storage — verify:payload-media-storage\n");

  const payloadConfig = read("payload.config.ts");
  const mediaCol = read("payload/collections/Media.ts");
  const reviewCol = read("payload/collections/ClientReviewMedia.ts");
  const commercialCol = read("payload/collections/CommercialDocuments.ts");
  const provision = read("lib/client-command/experience/composer/provision.ts");
  const inventoryUpload = read("app/api/portal/inventory/upload/route.ts");
  const inventoryMedia = read("lib/inventory/media.ts");
  const storageSrc = read("lib/media/payload-storage.ts");
  const pkg = read("package.json");
  const nextConfig = read("next.config.ts");
  const access = read("payload/access/index.ts");

  check(
    "official Payload Vercel Blob adapter is a dependency",
    pkg.includes('"@payloadcms/storage-vercel-blob"'),
  );
  check(
    "payload.config wires vercelBlobStorage for media only",
    payloadConfig.includes("vercelBlobStorage(") &&
      payloadConfig.includes("shouldEnablePayloadMediaBlobStorage()") &&
      payloadConfig.includes("payloadMediaBlobToken()") &&
      payloadConfig.includes("generatePayloadMediaFileUrl") &&
      payloadConfig.includes("media: {") &&
      !payloadConfig.includes("commercial-documents") &&
      !payloadConfig.includes("client-review-media"),
  );
  check(
    "plugin is not given an empty token string",
    !payloadConfig.includes('token: ""') && !payloadConfig.includes("token: ''"),
  );
  check(
    "Media remains intentionally publicRead",
    mediaCol.includes("publicRead") && access.includes("export const publicRead: Access = () => true"),
  );
  check(
    "private commercial + review collections are not publicRead",
    !commercialCol.includes("publicRead") && !reviewCol.includes("publicRead"),
  );
  check(
    "Vercel without public media token disables local ephemeral media writes",
    mediaCol.includes("disableLocalStorage") &&
      mediaCol.includes("payloadMediaBlobToken") &&
      !mediaCol.includes("BLOB_READ_WRITE_TOKEN"),
  );
  const mediaTokenFn =
    storageSrc.match(/export function payloadMediaBlobToken\(\)[\s\S]*?\n\}/)?.[0] ?? "";
  check(
    "media storage policy does not reuse the private commercial blob token",
    storageSrc.includes("MEDIA_BLOB_READ_WRITE_TOKEN") &&
      storageSrc.includes("BLOB_READ_WRITE_TOKEN is reserved") &&
      mediaTokenFn.includes("MEDIA_BLOB_TOKEN_ENV") &&
      !mediaTokenFn.includes("BLOB_READ_WRITE_TOKEN"),
  );
  check(
    "logo import fail-closes without durable storage and rolls back onboarding",
    provision.includes("requireDurablePayloadMedia") &&
      provision.includes("isDurablePayloadMediaUrl") &&
      provision.includes("rollbackLogoImport") &&
      provision.includes("createdOnboardingId") &&
      provision.includes("previousLogoFiles") &&
      !provision.includes("saveOperatorExperience"),
  );
  check(
    "inventory upload uses the same media collection and durable gate",
    inventoryUpload.includes('collection: "media"') &&
      inventoryUpload.includes("requireDurablePayloadMedia") &&
      inventoryUpload.includes("isDurablePayloadMediaUrl") &&
      !inventoryUpload.includes("client-review-media"),
  );
  check(
    "inventory resolveMediaPath no longer prefixes https blob URLs",
    inventoryMedia.includes("https?:") && inventoryMedia.includes("raw.startsWith(\"/\")"),
  );
  check(
    "Next image remotePatterns allow Vercel Blob public host",
    nextConfig.includes("*.public.blob.vercel-storage.com"),
  );

  const diskFiles = walkPublicMedia(path.join(root, "public/media"));
  check(
    "bundled public media manifest matches public/media",
    JSON.stringify([...BUNDLED_PUBLIC_MEDIA_PATHS]) === JSON.stringify(diskFiles),
  );
  check(
    "bundled primal/cusick files keep /media URLs",
    bundledPublicMediaSrc("LS_PRIMAL_SEBRING2026_03.jpg") === "/media/LS_PRIMAL_SEBRING2026_03.jpg" &&
      bundledPublicMediaSrc("kxd-logo.svg") === "/media/brand/kxd-logo.svg",
  );

  withEnv(
    {
      VERCEL: "1",
      VERCEL_ENV: "production",
      MEDIA_BLOB_READ_WRITE_TOKEN: undefined,
      BLOB_READ_WRITE_TOKEN: undefined,
      BLOB_STORE_ID: "store_only_is_not_enough",
    },
    () => {
      check("production-like without public media token does not enable Payload adapter", !shouldEnablePayloadMediaBlobStorage());
      check("production-like without public media token fail-closes uploads", !requireDurablePayloadMedia().ok);
      check(
        "ephemeral /media upload URL is rejected on Vercel",
        !isDurablePayloadMediaUrl("/media/runtime-upload-not-bundled.png"),
      );
      check(
        "bundled /media URL remains durable on Vercel",
        isDurablePayloadMediaUrl("/media/LS_PRIMAL_SEBRING2026_03.jpg"),
      );
    },
  );

  const privateToken = "vercel_blob_rw_private1_secretpart";
  withEnv(
    {
      VERCEL: "1",
      VERCEL_ENV: "production",
      BLOB_READ_WRITE_TOKEN: privateToken,
      MEDIA_BLOB_READ_WRITE_TOKEN: undefined,
    },
    () => {
      check("private commercial token alone does not enable public media adapter", !shouldEnablePayloadMediaBlobStorage());
      check("private commercial token alone fail-closes public media uploads", !requireDurablePayloadMedia().ok);
    },
  );

  const sampleToken = "vercel_blob_rw_abc123xyz_secretpart";
  withEnv(
    {
      VERCEL: "1",
      VERCEL_ENV: "production",
      MEDIA_BLOB_READ_WRITE_TOKEN: sampleToken,
      BLOB_READ_WRITE_TOKEN: privateToken,
    },
    () => {
    check("public media token enables Payload adapter", shouldEnablePayloadMediaBlobStorage());
    check("requireDurablePayloadMedia passes when public media token is distinct", requireDurablePayloadMedia().ok);
    check(
      "token parses public blob base URL",
      vercelBlobPublicBaseUrlFromToken() === "https://abc123xyz.public.blob.vercel-storage.com",
    );
    check(
      "imported logo filename receives storage-backed blob URL",
      generatePayloadMediaFileUrl({ filename: "otp-carts-logo.png" }) ===
        "https://abc123xyz.public.blob.vercel-storage.com/otp-carts-logo.png",
    );
    check(
      "bundled filename is not rewritten to blob",
      generatePayloadMediaFileUrl({ filename: "LS_PRIMAL_SEBRING2026_03.jpg" }) ===
        "/media/LS_PRIMAL_SEBRING2026_03.jpg",
    );
    check("payloadMediaBlobToken returns configured public media token", payloadMediaBlobToken() === sampleToken);
    },
  );

  withEnv(
    {
      VERCEL: "1",
      VERCEL_ENV: "production",
      MEDIA_BLOB_READ_WRITE_TOKEN: privateToken,
      BLOB_READ_WRITE_TOKEN: privateToken,
    },
    () => {
      check("reusing the private store token as MEDIA token fail-closes", !requireDurablePayloadMedia().ok);
    },
  );

  withEnv({ VERCEL: undefined, VERCEL_ENV: undefined, MEDIA_BLOB_READ_WRITE_TOKEN: undefined }, () => {
    check("local /media URLs remain durable without Vercel", isDurablePayloadMediaUrl("/media/dev-upload.png"));
    check("local without token does not enable blob adapter", !shouldEnablePayloadMediaBlobStorage());
  });

  check(
    "private-store Blob error is explained without leaking internals",
    explainPayloadMediaUploadFailure(
      new Error("There was an error while uploading files corresponding to the collection media with filename logo-otp-mark.png:", {
        cause: new Error("Vercel Blob: Cannot use public access on a private store. The store is configured with private access."),
      }),
    ).includes("separate public Vercel Blob store") &&
      explainPayloadMediaUploadFailure(
        new Error("There was an error while uploading files corresponding to the collection media with filename logo-otp-mark.png:", {
          cause: new Error("Vercel Blob: Cannot use public access on a private store. The store is configured with private access."),
        }),
      ).includes("MEDIA_BLOB_READ_WRITE_TOKEN"),
  );

  check("https media URLs are durable", isDurablePayloadMediaUrl("https://cdn.example.com/logo.png"));
  check("empty media URL is not durable", !isDurablePayloadMediaUrl("") && !isDurablePayloadMediaUrl(null));

  const blobResolved = resolveMediaPath(
    { id: 9, url: "https://abc123xyz.public.blob.vercel-storage.com/car.png", alt: "Car" },
    "original",
  );
  check(
    "inventory path preserves blob https URL",
    blobResolved?.path === "https://abc123xyz.public.blob.vercel-storage.com/car.png",
  );
  check(
    "inventory absolute helper keeps blob URL",
    toAbsoluteMediaUrl("https://abc123xyz.public.blob.vercel-storage.com/car.png") ===
      "https://abc123xyz.public.blob.vercel-storage.com/car.png",
  );
  check(
    "inventory still resolves site-relative /media paths",
    resolveMediaPath({ id: 1, url: "/media/car.jpg", alt: "Car" })?.path === "/media/car.jpg",
  );

  check(
    "experience loader still prefers stored media.url",
    resolveMediaAssetUrl({
      id: 12,
      url: "https://abc123xyz.public.blob.vercel-storage.com/logo.png",
      filename: "logo.png",
    }) === "https://abc123xyz.public.blob.vercel-storage.com/logo.png",
  );

  const svg = await prepareManagedLogoUpload({
    buffer: Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#111"/></svg>`,
    ),
    mime: "image/svg+xml",
    filename: "logo-mark.svg",
  });
  check("SVG import still rasterizes to PNG", svg.ok && svg.ok && svg.file.mime === "image/png" && svg.file.rasterizedFromSvg);
  if (svg.ok) {
    check("rasterized SVG is a real PNG buffer", svg.file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
  }

  if (failed) {
    console.error(`\nPayload Media storage verification failed (${failed}).\n`);
    process.exit(1);
  }
  console.log("\nPayload Media storage verification passed.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
