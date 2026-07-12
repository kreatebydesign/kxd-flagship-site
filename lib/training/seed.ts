import "server-only";

import type { Payload } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";
import { TRAINING_CATALOG } from "./catalog";
import {
  TRAINING_LESSONS_COLLECTION,
  TRAINING_PATHS_COLLECTION,
} from "./constants";
import type { TrainingLessonDefinition, TrainingPathDefinition } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export interface TrainingSeedResult {
  pathsCreated: number;
  pathsUpdated: number;
  lessonsCreated: number;
  lessonsUpdated: number;
  pathsArchived: number;
}

function lessonPayloadData(pathId: number, lesson: TrainingLessonDefinition): AnyDoc {
  return {
    slug: lesson.slug,
    path: pathId,
    title: lesson.title,
    summary: lesson.summary,
    objective: lesson.objective,
    estimatedMinutes: lesson.estimatedMinutes,
    sortOrder: lesson.sortOrder,
    status: lesson.status,
    body: lesson.content.body,
    steps: lesson.content.steps.map((step) => ({
      title: step.title,
      detail: step.detail,
    })),
    examples: lesson.content.examples.map((text) => ({ text })),
    commonMistakes: lesson.content.commonMistakes.map((text) => ({ text })),
    bestPractices: lesson.content.bestPractices.map((text) => ({ text })),
    checklist: lesson.content.checklist.map((item) => ({
      itemId: item.id,
      label: item.label,
      required: item.required ?? false,
    })),
    resources: lesson.content.resources.map((resource) => ({
      label: resource.label,
      href: resource.href ?? undefined,
      note: resource.note ?? undefined,
    })),
    images: lesson.content.images.map((image) => ({
      url: image.url,
      alt: image.alt,
      caption: image.caption ?? undefined,
    })),
    knowledgeCheckPlaceholder: lesson.content.knowledgeCheckPlaceholder ?? undefined,
    practiceTaskPlaceholder: lesson.content.practiceTaskPlaceholder ?? undefined,
    practiceWorkKey: lesson.practiceWorkKey ?? undefined,
    workStage: lesson.workStage ?? "learn",
    operationsFrame: {
      osAlreadyDoes: lesson.content.operations.osAlreadyDoes,
      yourResponsibility: lesson.content.operations.yourResponsibility,
      askIntelligenceWhen: lesson.content.operations.askIntelligenceWhen,
      escalateWhen: lesson.content.operations.escalateWhen,
      successLooksLike: lesson.content.operations.successLooksLike,
      walkthrough: lesson.content.walkthrough,
      intelligencePrompts: lesson.content.intelligencePrompts,
      operationalPractice: lesson.content.operationalPractice,
    },
  };
}

function pathPayloadData(path: TrainingPathDefinition): AnyDoc {
  return {
    slug: path.slug,
    title: path.title,
    summary: path.summary,
    description: path.description,
    estimatedMinutes: path.estimatedMinutes,
    sortOrder: path.sortOrder,
    status: path.status,
    audience: path.audience,
  };
}

/**
 * Upsert editorial catalog into Payload — creates or updates by slug.
 * Archives Payload paths that are no longer in the catalog.
 */
export async function seedTrainingCatalog(
  payloadInstance?: Payload,
): Promise<TrainingSeedResult> {
  const payload = payloadInstance ?? (await getPayload({ config }));
  let pathsCreated = 0;
  let pathsUpdated = 0;
  let lessonsCreated = 0;
  let lessonsUpdated = 0;
  let pathsArchived = 0;

  const catalogSlugs = new Set(TRAINING_CATALOG.map((path) => path.slug));

  for (const path of TRAINING_CATALOG) {
    const existingPaths = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: TRAINING_PATHS_COLLECTION as any,
      where: { slug: { equals: path.slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    let pathId: number;
    if (existingPaths.docs[0]) {
      pathId = Number((existingPaths.docs[0] as AnyDoc).id);
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: TRAINING_PATHS_COLLECTION as any,
        id: pathId,
        data: pathPayloadData(path),
        overrideAccess: true,
      });
      pathsUpdated += 1;
    } else {
      const created = await payload.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: TRAINING_PATHS_COLLECTION as any,
        data: pathPayloadData(path),
        overrideAccess: true,
      });
      pathId = Number((created as AnyDoc).id);
      pathsCreated += 1;
    }

    for (const lesson of path.lessons) {
      const existingLessons = await payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: TRAINING_LESSONS_COLLECTION as any,
        where: {
          and: [{ slug: { equals: lesson.slug } }, { path: { equals: pathId } }],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });

      const data = lessonPayloadData(pathId, lesson);
      if (existingLessons.docs[0]) {
        await payload.update({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: TRAINING_LESSONS_COLLECTION as any,
          id: Number((existingLessons.docs[0] as AnyDoc).id),
          data,
          overrideAccess: true,
        });
        lessonsUpdated += 1;
      } else {
        await payload.create({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: TRAINING_LESSONS_COLLECTION as any,
          data,
          overrideAccess: true,
        });
        lessonsCreated += 1;
      }
    }
  }

  try {
    const allPaths = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: TRAINING_PATHS_COLLECTION as any,
      limit: 200,
      depth: 0,
      overrideAccess: true,
    });
    for (const doc of allPaths.docs as AnyDoc[]) {
      const slug = String(doc.slug ?? "");
      if (slug && !catalogSlugs.has(slug) && doc.status !== "archived") {
        await payload.update({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: TRAINING_PATHS_COLLECTION as any,
          id: doc.id,
          data: { status: "archived" },
          overrideAccess: true,
        });
        pathsArchived += 1;
      }
    }
  } catch {
    /* archive optional */
  }

  return { pathsCreated, pathsUpdated, lessonsCreated, lessonsUpdated, pathsArchived };
}

/** Always sync catalog so progress refs and CMS stay aligned with Operations Experience. */
export async function ensureTrainingSeeded(payloadInstance?: Payload): Promise<void> {
  const payload = payloadInstance ?? (await getPayload({ config }));
  try {
    await seedTrainingCatalog(payload);
  } catch {
    // Collections may not be migrated yet — catalog fallback still works.
  }
}
