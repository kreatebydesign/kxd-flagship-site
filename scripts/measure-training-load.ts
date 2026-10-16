/**
 * Local micro-benchmark: in-process catalog read vs legacy full-dashboard assembly (no Payload seed).
 */
import { performance } from "node:perf_hooks";
import { readPublishedCatalog } from "../lib/training/curriculum";
import { filterCatalogForUser } from "../lib/training/role-access";
import { buildProgressMap, pickContinueLesson, pickRecommendedLesson, toPathView } from "../lib/training/map";
import { primaryTrainingPathSlugForRole } from "../lib/training/role-access";

const heather = {
  id: 42,
  email: "heather@kreatebydesign.com",
  role: "editor",
  staffRole: "operations_coordinator",
};

const tyler = {
  id: 99,
  email: "tyler@kreatebydesign.com",
  role: "editor",
  staffRole: "business_development_specialist",
};

function buildSummaryView(user: object, iterations: number): number {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    const staffRole =
      Reflect.get(user, "staffRole") === "business_development_specialist"
        ? "business_development_specialist"
        : "operations_coordinator";
    const primaryPathSlug = primaryTrainingPathSlugForRole(staffRole);
    const curriculum = filterCatalogForUser(readPublishedCatalog(), user);
    const progressMap = buildProgressMap([]);
    const paths = curriculum
      .filter((path) => path.status === "published")
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((path) => toPathView(path, progressMap));
    pickContinueLesson(paths);
    pickRecommendedLesson(paths, primaryPathSlug);
  }
  return performance.now() - start;
}

const iterations = 200;
const heatherMs = buildSummaryView(heather, iterations);
const tylerMs = buildSummaryView(tyler, iterations);

console.log("\nmeasure:training-load (in-process, no DB)\n");
console.log(
  `Summary assembly (${iterations}×): coordinator ${(heatherMs / iterations).toFixed(3)} ms/op`,
);
console.log(
  `Summary assembly (${iterations}×): BDS ${(tylerMs / iterations).toFixed(3)} ms/op`,
);
console.log(
  "\nNote: legacy ensureTrainingSeeded + seedTrainingCatalog issued many Payload writes per request; that path is now a no-op on reads. Compare production TTFB after deploy.\n",
);
