"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { JuniorAssignedTaskView } from "@/lib/junior-creators/tasks-labels";
import {
  JUNIOR_TASK_PRIORITY_LABEL,
  JUNIOR_TASK_STATUS_LABEL,
} from "@/lib/junior-creators/tasks-labels";

const C = {
  bgElevated: "#27282a",
  bgCard: "#2b2c2e",
  gold: "#c2aa72",
  goldDim: "rgba(194,170,114,0.55)",
  cream: "#f5f6f8",
  creamMuted: "rgba(245,246,248,0.74)",
  red: "#e07070",
  border: "rgba(255,255,255,0.06)",
  borderGold: "rgba(194,170,114,0.16)",
  serif: "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', var(--font-outfit, 'Helvetica Neue'), Arial, sans-serif",
} as const;

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontFamily: C.sans,
  fontSize: "0.75rem",
  color: C.cream,
  background: "#27282a",
  border: `1px solid ${C.border}`,
  padding: "0.5rem 0.625rem",
  outline: "none",
};

type CreatorOption = {
  id: number;
  displayName: string;
};

type Props = {
  creators: CreatorOption[];
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

export function AdminJuniorAssignedTasks({ creators, tasks }: Props) {
  const router = useRouter();
  const [filterJuniorId, setFilterJuniorId] = useState<string>("all");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [clientLabel, setClientLabel] = useState("Internal KXD");
  const [juniorCreatorUserId, setJuniorCreatorUserId] = useState(
    creators[0] ? String(creators[0].id) : "",
  );
  const [priority, setPriority] = useState("high");
  const [estimatedMinutes, setEstimatedMinutes] = useState("30");
  const [relatedLink, setRelatedLink] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (filterJuniorId === "all") return tasks;
    const id = Number(filterJuniorId);
    return tasks.filter((t) => t.juniorCreatorUserId === id);
  }, [tasks, filterJuniorId]);

  const selected = filtered.find((t) => t.id === selectedId) ?? null;

  const nameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of creators) map.set(c.id, c.displayName);
    return map;
  }, [creators]);

  async function createTask() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/junior-creator-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          instructions,
          clientLabel,
          juniorCreatorUserId: Number(juniorCreatorUserId),
          priority,
          estimatedMinutes: Number(estimatedMinutes),
          relatedLink: relatedLink || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Create failed.");
        return;
      }
      setTitle("");
      setInstructions("");
      setRelatedLink("");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function patch(body: Record<string, unknown>) {
    if (!selectedId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/junior-creator-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: selectedId, ...body }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Update failed.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ marginTop: "2.5rem", marginBottom: "2rem" }}>
      <Label style={{ color: C.goldDim, marginBottom: "0.5rem" }}>
        Assigned Tasks
      </Label>
      <p
        style={{
          fontFamily: C.sans,
          fontSize: "0.8125rem",
          color: C.creamMuted,
          marginBottom: "1.25rem",
        }}
      >
        Assign real client or Internal KXD work. Separate from Junior Academy
        training missions.
      </p>

      <div
        style={{
          background: C.bgCard,
          border: `1px solid ${C.borderGold}`,
          padding: "1.25rem",
          marginBottom: "1rem",
        }}
      >
        <Label style={{ marginBottom: "0.75rem" }}>Create task</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label style={{ marginBottom: "0.35rem" }}>Title</Label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <Label style={{ marginBottom: "0.35rem" }}>Client / Internal</Label>
            <input
              value={clientLabel}
              onChange={(e) => setClientLabel(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <Label style={{ marginBottom: "0.35rem" }}>Junior Creator</Label>
            <select
              value={juniorCreatorUserId}
              onChange={(e) => setJuniorCreatorUserId(e.target.value)}
              style={inputStyle}
            >
              {creators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label style={{ marginBottom: "0.35rem" }}>Priority</Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={inputStyle}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <Label style={{ marginBottom: "0.35rem" }}>Est. minutes</Label>
              <input
                type="number"
                min={1}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        </div>
        <div style={{ marginTop: "0.75rem" }}>
          <Label style={{ marginBottom: "0.35rem" }}>Instructions</Label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={5}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>
        <div style={{ marginTop: "0.75rem" }}>
          <Label style={{ marginBottom: "0.35rem" }}>
            Related folder / link (optional)
          </Label>
          <input
            value={relatedLink}
            onChange={(e) => setRelatedLink(e.target.value)}
            style={inputStyle}
          />
        </div>
        <button
          type="button"
          disabled={loading || !title.trim() || !instructions.trim()}
          onClick={createTask}
          style={{
            marginTop: "0.85rem",
            fontFamily: C.sans,
            fontSize: "0.6875rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#0a0a0a",
            background: C.gold,
            border: "none",
            padding: "0.65rem 1rem",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          Assign Task
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <Label>View by Junior</Label>
        <select
          value={filterJuniorId}
          onChange={(e) => {
            setFilterJuniorId(e.target.value);
            setSelectedId(null);
          }}
          style={{ ...inputStyle, width: "auto", minWidth: "12rem" }}
        >
          <option value="all">All Juniors</option>
          {creators.map((c) => (
            <option key={c.id} value={c.id}>
              {c.displayName}
            </option>
          ))}
        </select>
      </div>

      <div style={{ border: `1px solid ${C.border}` }}>
        {filtered.length === 0 ? (
          <div
            style={{
              background: C.bgElevated,
              padding: "1rem 1.25rem",
            }}
          >
            <p
              style={{
                fontFamily: C.sans,
                fontSize: "0.8125rem",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              No assigned tasks in this view.
            </p>
          </div>
        ) : (
          filtered.map((task, i) => (
            <button
              key={task.id}
              type="button"
              onClick={() => setSelectedId(task.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background:
                  selectedId === task.id ? C.bgCard : C.bgElevated,
                border: "none",
                borderBottom:
                  i < filtered.length - 1 ? `1px solid ${C.border}` : "none",
                padding: "0.85rem 1.15rem",
                cursor: "pointer",
              }}
            >
              <p
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.875rem",
                  color: C.cream,
                }}
              >
                {task.title}
              </p>
              <p
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.75rem",
                  color: "rgba(255,255,255,0.35)",
                  marginTop: "0.25rem",
                }}
              >
                {nameById.get(task.juniorCreatorUserId) ?? "Junior"} ·{" "}
                {task.clientLabel} ·{" "}
                {JUNIOR_TASK_PRIORITY_LABEL[task.priority]} ·{" "}
                {JUNIOR_TASK_STATUS_LABEL[task.status]}
              </p>
            </button>
          ))
        )}
      </div>

      {selected ? (
        <div
          style={{
            marginTop: "1px",
            background: C.bgCard,
            border: `1px solid ${C.borderGold}`,
            padding: "1.15rem",
          }}
        >
          <p
            style={{
              fontFamily: C.serif,
              fontSize: "1.15rem",
              color: C.cream,
              marginBottom: "0.5rem",
            }}
          >
            {selected.title}
          </p>
          <pre
            style={{
              fontFamily: C.sans,
              fontSize: "0.8125rem",
              whiteSpace: "pre-wrap",
              color: C.creamMuted,
              marginBottom: "0.85rem",
            }}
          >
            {selected.instructions}
          </pre>
          {selected.completionNotes ? (
            <div style={{ marginBottom: "0.85rem" }}>
              <Label style={{ marginBottom: "0.35rem" }}>
                Completion notes
              </Label>
              <pre
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.8125rem",
                  whiteSpace: "pre-wrap",
                  color: C.cream,
                  background: C.bgElevated,
                  padding: "0.75rem",
                  border: `1px solid ${C.border}`,
                }}
              >
                {selected.completionNotes}
              </pre>
            </div>
          ) : (
            <p
              style={{
                fontFamily: C.sans,
                fontSize: "0.8125rem",
                color: "rgba(255,255,255,0.3)",
                marginBottom: "0.85rem",
              }}
            >
              No completion notes yet.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <SmallBtn
              disabled={loading}
              onClick={() => patch({ action: "complete" })}
              label="Mark Completed"
            />
            <SmallBtn
              disabled={loading}
              onClick={() => patch({ action: "archive" })}
              label="Archive"
            />
            <SmallBtn
              disabled={loading}
              onClick={() => patch({ action: "cancel" })}
              label="Cancel"
              danger
            />
            {creators.map((c) =>
              c.id === selected.juniorCreatorUserId ? null : (
                <SmallBtn
                  key={c.id}
                  disabled={loading}
                  onClick={() =>
                    patch({
                      action: "reassign",
                      juniorCreatorUserId: c.id,
                    })
                  }
                  label={`Reassign → ${c.displayName}`}
                />
              ),
            )}
          </div>
        </div>
      ) : null}

      {error ? (
        <p
          style={{
            fontFamily: C.sans,
            fontSize: "0.8125rem",
            color: C.red,
            marginTop: "0.75rem",
          }}
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}

function SmallBtn({
  label,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        fontFamily: C.sans,
        fontSize: "0.6875rem",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: danger ? C.red : C.goldDim,
        background: "transparent",
        border: `1px solid ${danger ? "rgba(210,90,90,0.35)" : C.borderGold}`,
        padding: "0.5rem 0.75rem",
        cursor: disabled ? "wait" : "pointer",
      }}
    >
      {label}
    </button>
  );
}
