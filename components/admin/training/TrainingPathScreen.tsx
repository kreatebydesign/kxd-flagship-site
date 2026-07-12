import Link from "next/link";
import { TRAINING_HOME } from "@/lib/training/constants";
import type { TrainingPathView } from "@/lib/training/types";
import { TrainingShell } from "./TrainingShell";

export function TrainingPathScreen({ path }: { path: TrainingPathView }) {
  return (
    <TrainingShell active="path">
      <p className="kxd-os-training__crumb">
        <Link href={TRAINING_HOME}>Operations</Link>
        <span aria-hidden> / </span>
        <span>{path.title}</span>
      </p>

      <header className="kxd-os-training__hero">
        <p className="kxd-os-training__eyebrow">{path.audience}</p>
        <h1 className="kxd-os-training__headline">{path.title}</h1>
        <p className="kxd-os-training__lede">{path.description}</p>
        <p className="kxd-os-training__stats">
          {path.percentComplete}% · {path.completedCount}/{path.lessonCount} lessons ·{" "}
          {path.estimatedMinutes} min
        </p>
      </header>

      <section className="kxd-os-training__section">
        <h2 className="kxd-os-training__section-title">Lessons</h2>
        <ol className="kxd-os-training__lesson-list">
          {path.lessons.map((lesson, index) => (
            <li key={lesson.slug}>
              <Link href={lesson.href} className="kxd-os-training__row">
                <div>
                  <p className="kxd-os-training__row-title">
                    <span className="kxd-os-training__index">{index + 1}</span>
                    {lesson.title}
                  </p>
                  <p className="kxd-os-training__row-meta">
                    {lesson.summary} · {lesson.estimatedMinutes} min ·{" "}
                    {(lesson.progress?.status ?? "not-started").replace("-", " ")}
                  </p>
                </div>
                <span className="kxd-os-training__row-action">Open</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </TrainingShell>
  );
}
