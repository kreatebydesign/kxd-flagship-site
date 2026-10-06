import sharp from "sharp";

const src = "public/migrated-assets/brand/kxd-network-private-access-invite-v5.png";
const out = "public/migrated-assets/brand/kxd-network-private-access-og-1200x630.png";

async function main() {
  const scaled = await sharp(src).resize({ width: 1200 }).toBuffer();
  const scaledMeta = await sharp(scaled).metadata();
  const extractTop = 230;
  await sharp(scaled)
    .extract({ left: 0, top: extractTop, width: 1200, height: 630 })
    .png({ compressionLevel: 9 })
    .toFile(out);
  const final = await sharp(out).metadata();
  console.log({
    scaled: { w: scaledMeta.width, h: scaledMeta.height },
    extractTop,
    final: { w: final.width, h: final.height },
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
