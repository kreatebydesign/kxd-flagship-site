"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { JuniorAssignedTaskView } from "@/lib/junior-creators/tasks-labels";
import {
  JUNIOR_TASK_PRIORITY_LABEL,
  JUNIOR_TASK_STATUS_LABEL,
} from "@/lib/junior-creators/tasks-labels";

const C = {
  bgCard: "#101010",
  bgElevated: "#0B0B0B",
  gold: "#C9A962",
  goldDim: "rgba(201,169,98,0.55)",
  cream: "#F5F1E8",
  creamMuted: "rgba(245,241,232,0.72)",
  border: "rgba(255,255,255,0.08)",
  borderGold: "rgba(201,169,98,0.16)",
  red: "#e07070",
  sans: "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
  serif: "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
} as const;

type Props = {
  tasks: JuniorAssignedTaskView[];
};

function Label({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <p
      style={{
        fontFamily: C.sans,
        fontSize: "0.6875rem",
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.3)",
        ...style,
      }}
    >
      {children}
    </p>
  );
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export function JuniorAssignedTasks({ tasks: initialTasks }: Props) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [openId, setOpenId] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const openTask = useMemo(
    () => tasks.find((t) => t.id === openId) ?? null,
    [tasks, openId],
  );

  function open(task: JuniorAssignedTaskView) {
    setOpenId(task.id);
    setNotesDraft(task.completionNotes ?? "");
    setError("");
    setMessage("");
  }

  async function patch(body: Record<string, unknown>) {
    if (!openId) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/junior-creators/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: openId, ...body }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Could not update task.");
        return;
      }
      const updated = data.task as JuniorAssignedTaskView;
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setNotesDraft(updated.completionNotes ?? "");
      setMessage("Saved.");
      router.refresh();
    } catch {
      setError("Could not update task.");
    } finally {
      setLoading(false);
    }
  }

  const activeCount = tasks.filter(
    (t) => t.status !== "completed" && t.status !== "cancelled",
  ).length;

  return (
    <section className="mb-10">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <div>
          <Label style={{ color: C.goldDim, marginBottom: "0.35rem" }}>
            Assigned Tasks
          </Label>
          <p
            style={{
              fontFamily: C.sans,
              fontSize: "0.8125rem",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            Real client and Internal KXD work from Matt — separate from Academy
            training.
          </p>
        </div>
        <p
          style={{
            fontFamily: C.sans,
            fontSize: "0.6875rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: C.goldDim,
          }}
        >
          {activeCount} open
        </p>
      </div>

      {tasks.length === 0 ? (
        <div
          style={{
            background: C.bgElevated,
            border: `1px solid ${C.border}`,
            padding: "1.25rem 1.5rem",
          }}
        >
          <p
            style={{
              fontFamily: C.sans,
              fontSize: "0.8125rem",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            No assigned tasks yet. When Matt assigns work, it will show up here.
          </p>
        </div>
      ) : (
        <div style={{ border: `1px solid ${C.border}` }}>
          {tasks.map((task, i) => {
            const selected = openId === task.id;
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => open(task)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: selected ? C.bgCard : C.bgElevated,
                  padding: "1rem 1.25rem",
                  border: "none",
                  borderBottom:
                    i < tasks.length - 1 ? `1px solid ${C.border}` : "none",
                  cursor: "pointer",
                  borderLeft: selected
                    ? `2px solid ${C.gold}`
                    : "2px solid transparent",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontFamily: C.sans,
                        fontSize: "0.9375rem",
                        color: C.cream,
                        fontWeight: 500,
                      }}
                    >
                      {task.title}
                    </p>
                    <p
                      style={{
                        fontFamily: C.sans,
                        fontSize: "0.75rem",
                        color: "rgba(255,255,255,0.35)",
                        marginTop: "0.35rem",
                      }}
                    >
                      {task.clientLabel} ·{" "}
                      {JUNIOR_TASK_PRIORITY_LABEL[task.priority]} ·{" "}
                      {formatMinutes(task.estimatedMinutes)}
                    </p>
                  </div>
                  <span
                    style={{
                      fontFamily: C.sans,
                      fontSize: "0.6875rem",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color:
                        task.status === "ready_for_review"
                          ? C.gold
                          : task.status === "blocked"
                            ? C.red
                            : C.creamMuted,
                    }}
                  >
                    {JUNIOR_TASK_STATUS_LABEL[task.status]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {openTask ? (
        <div
          style={{
            marginTop: "1px",
            background: C.bgCard,
            border: `1px solid ${C.borderGold}`,
            padding: "1.25rem 1.375rem",
          }}
        >
          <Label style={{ color: C.goldDim, marginBottom: "0.5rem" }}>
            Task details
          </Label>
          <h3
            style={{
              fontFamily: C.serif,
              fontWeight: 400,
              fontSize: "1.35rem",
              color: C.cream,
              margin: "0 0 0.75rem",
            }}
          >
            {openTask.title}
          </h3>
          <p
            style={{
              fontFamily: C.sans,
              fontSize: "0.8125rem",
              color: C.creamMuted,
              marginBottom: "1rem",
            }}
          >
            {openTask.clientLabel} ·{" "}
            {JUNIOR_TASK_PRIORITY_LABEL[openTask.priority]} priority · Est.{" "}
            {formatMinutes(openTask.estimatedMinutes)}
            {openTask.dueAt
              ? ` · Due ${new Date(openTask.dueAt).toLocaleDateString()}`
              : ""}
          </p>

          <Label style={{ marginBottom: "0.5rem" }}>Instructions</Label>
          <pre
            style={{
              fontFamily: C.sans,
              fontSize: "0.875rem",
              lineHeight: 1.55,
              color: C.cream,
              whiteSpace: "pre-wrap",
              margin: "0 0 1.25rem",
              background: C.bgElevated,
              border: `1px solid ${C.border}`,
              padding: "1rem",
            }}
          >
            {openTask.instructions}
          </pre>

          {openTask.relatedLink ? (
            <p
              style={{
                fontFamily: C.sans,
                fontSize: "0.8125rem",
                color: C.goldDim,
                marginBottom: "1rem",
              }}
            >
              Related: {openTask.relatedLink}
            </p>
          ) : null}

          <Label style={{ marginBottom: "0.5rem" }}>Your notes</Label>
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            rows={4}
            placeholder="Add notes, file locations, or questions for Matt…"
            style={{
              width: "100%",
              fontFamily: C.sans,
              fontSize: "0.875rem",
              color: C.cream,
              background: C.bgElevated,
              border: `1px solid ${C.border}`,
              padding: "0.75rem",
              resize: "vertical",
              marginBottom: "0.75rem",
            }}
          />

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              marginBottom: "0.75rem",
            }}
          >
            <ActionButton
              disabled={loading || openTask.status === "completed"}
              onClick={() =>
                patch({ status: "in_progress", completionNotes: notesDraft })
              }
              label="In Progress"
            />
            <ActionButton
              disabled={loading || openTask.status === "completed"}
              onClick={() =>
                patch({
                  status: "ready_for_review",
                  completionNotes: notesDraft,
                })
              }
              label="Ready for Review"
              primary
            />
            <ActionButton
              disabled={loading || openTask.status === "completed"}
              onClick={() =>
                patch({ status: "blocked", completionNotes: notesDraft })
              }
              label="Blocked"
            />
            <ActionButton
              disabled={loading || openTask.status === "completed"}
              onClick={() => patch({ completionNotes: notesDraft })}
              label="Save Notes"
            />
          </div>

          {error ? (
            <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.red }}>
              {error}
            </p>
          ) : null}
          {message ? (
            <p
              style={{
                fontFamily: C.sans,
                fontSize: "0.8125rem",
                color: C.goldDim,
              }}
            >
              {message}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  primary,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        fontFamily: C.sans,
        fontSize: "0.6875rem",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: primary ? "#0a0a0a" : C.goldDim,
        background: primary ? C.gold : "transparent",
        border: `1px solid ${C.borderGold}`,
        padding: "0.625rem 0.85rem",
        cursor: disabled ? "wait" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {label}
    </button>
  );
}
