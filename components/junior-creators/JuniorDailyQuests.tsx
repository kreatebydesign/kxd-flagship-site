import {
  evaluateDailyQuests,
  getQuestsCompletedCount,
  getQuestsSummaryLabel,
  type QuestContext,
} from "@/lib/junior-creators/quests";
import { KXD_OS as C } from "@/lib/kxd-os/palette";

type Props = {
  questContext: QuestContext;
};

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p
      style={{
        fontFamily: C.sans,
        fontSize: "0.6875rem",
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: C.creamSubtle,
        ...style,
      }}
    >
      {children}
    </p>
  );
}

export function JuniorDailyQuests({ questContext }: Props) {
  const quests = evaluateDailyQuests(questContext);
  const completed = getQuestsCompletedCount(quests);

  return (
    <section className="mb-10">
      <div
        className="mb-4 flex flex-wrap items-baseline justify-between gap-3"
        style={{ marginBottom: "1rem" }}
      >
        <Label style={{ color: C.goldDim }}>Daily Challenges</Label>
        <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted }}>
          {getQuestsSummaryLabel(completed, quests.length)}
        </p>
      </div>

      <div
        className="grid gap-px sm:grid-cols-2"
        style={{
          background: C.border,
          border: `1px solid ${C.border}`,
        }}
      >
        {quests.map((quest) => {
          const progressPct = Math.min(100, Math.round((quest.current / quest.target) * 100));
          return (
            <div
              key={quest.id}
              style={{
                background: C.glass,
                padding: "1.25rem 1.375rem",
                borderLeft: quest.complete ? `2px solid ${C.gold}` : "2px solid transparent",
              }}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p
                  style={{
                    fontFamily: C.sans,
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: quest.complete ? C.goldDim : C.creamSubtle,
                  }}
                >
                  {quest.complete ? "Complete" : `${quest.current}/${quest.target}`}
                </p>
              </div>
              <p
                style={{
                  fontFamily: C.serif,
                  fontWeight: 400,
                  fontSize: "1.0625rem",
                  color: quest.complete ? C.cream : C.creamMuted,
                  lineHeight: 1.25,
                  marginBottom: "0.4rem",
                }}
              >
                {quest.title}
              </p>
              <p
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.8125rem",
                  color: C.creamSubtle,
                  lineHeight: 1.5,
                  marginBottom: "0.875rem",
                }}
              >
                {quest.description}
              </p>
              <div
                style={{
                  height: "3px",
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progressPct}%`,
                    height: "100%",
                    background: quest.complete ? C.gold : C.goldDim,
                    borderRadius: "2px",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
