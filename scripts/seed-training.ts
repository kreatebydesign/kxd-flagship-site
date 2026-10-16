/**
 * Explicit training catalog sync — run after catalog changes (not on page load).
 */
import { seedTrainingCatalog } from "../lib/training/seed";

async function main() {
  const result = await seedTrainingCatalog();
  console.log("Training catalog seed complete:", result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
