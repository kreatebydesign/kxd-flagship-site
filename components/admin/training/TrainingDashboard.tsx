import Link from "next/link";
import type { TrainingDashboardData, TrainingLessonView, TrainingPathView } from "@/lib/training/types";
import { TrainingShell } from "./TrainingShell";

function ProgressBar({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="kxd-os-training__progress" aria-hidden>
      <span className="kxd-os-training__progress-fill" style={{ width: `${safe}%` }} />
    </div>
  );
}

function LessonLink({ lesson }: { lesson: TrainingLessonView }) {
  const status = lesson.progress?.status ?? "not-started";
  return (
    <Link href={lesson.href} className="kxd-os-training__row">
      <div>
        <p className="kxd-os-training__row-title">{lesson.title}</p>
        <p className="kxd-os-training__row-meta">
          {lesson.pathTitle} · {lesson.estimatedMinutes} min · {status.replace("-", " ")}
        </p>
      </div>
      <span className="kxd-os-training__row-action">Continue</span>
    </Link>
  );
}

function PathCard({ path }: { path: TrainingPathView }) {
  return (
    <Link href={path.href} className="kxd-os-training__path-card">
      <p className="kxd-os-training__path-eyebrow">{path.audience}</p>
      <h3 className="kxd-os-training__path-title">{path.title}</h3>
      <p className="kxd-os-training__path-summary">{path.summary}</p>
      <div className="kxd-os-training__path-foot">
        <span>
          {path.completedCount}/{path.lessonCount} lessons
        </span>
        <span>{path.estimatedMinutes} min</span>
      </div>
      <ProgressBar value={path.percentComplete} />
    </Link>
  );
}

export function TrainingDashboard({ data }: { data: TrainingDashboardData }) {
  const track = data.growthTrack;

  return (
    <TrainingShell active="home">
      <header className="kxd-os-training__hero">
        <p className="kxd-os-training__eyebrow">Operations Experience</p>
        <h1 className="kxd-os-training__headline">{data.experienceTitle}</h1>
        <p className="kxd-os-training__lede">
          Welcome, {data.learnerLabel}. {data.experienceLede}
        </p>
        <p className="kxd-os-training__stats">
          {data.overallPercent}% complete · {data.completedLessons} of {data.totalLessons} lessons
          {data.canManage ? " · Curriculum admin" : ""}
        </p>
        <ProgressBar value={data.overallPercent} />
      </header>

      <section className="kxd-os-training__section">
        <h2 className="kxd-os-training__section-title">Your growth path</h2>
        <p className="kxd-os-training__prose">
          <strong>{track.roleTitle}.</strong> {track.roleSummary}
        </p>
        <p className="kxd-os-training__row-meta">
          Expanding into: {track.expandingInto.slice(0, 6).join(" · ")}
          {track.expandingInto.length > 6 ? " · …" : ""}
        </p>
        <p className="kxd-os-training__row-meta">
          Not included: {track.notIncluded.join(" · ")}
        </p>
      </section>

      <section className="kxd-os-training__section">
        <h2 className="kxd-os-training__section-title">Continue learning</h2>
        {data.continueLesson ? (
          <LessonLink lesson={data.continueLesson} />
        ) : data.recommendedLesson ? (
          <LessonLink lesson={data.recommendedLesson} />
        ) : (
          <p className="kxd-os-training__empty">All published lessons are complete. Beautiful.</p>
        )}
      </section>

      <section className="kxd-os-training__section">
        <h2 className="kxd-os-training__section-title">Recommended next</h2>
        {data.recommendedLesson ? (
          <LessonLink lesson={data.recommendedLesson} />
        ) : (
          <p className="kxd-os-training__empty">No recommendation right now.</p>
        )}
      </section>

      <section className="kxd-os-training__section">
        <h2 className="kxd-os-training__section-title">Operational paths</h2>
        <div className="kxd-os-training__path-grid">
          {data.paths.map((path) => (
            <PathCard key={path.slug} path={path} />
          ))}
        </div>
      </section>

      <section className="kxd-os-training__section">
        <h2 className="kxd-os-training__section-title">Recent lessons</h2>
        {data.recentLessons.length === 0 ? (
          <p className="kxd-os-training__empty">Open a path and walk through KXD OS.</p>
        ) : (
          <div className="kxd-os-training__stack">
            {data.recentLessons.map((lesson) => (
              <LessonLink key={`${lesson.pathSlug}-${lesson.slug}`} lesson={lesson} />
            ))}
          </div>
        )}
      </section>
    </TrainingShell>
  );
}
