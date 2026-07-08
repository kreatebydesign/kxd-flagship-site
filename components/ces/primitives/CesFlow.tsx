"use client";

import type { ReactNode } from "react";

export interface CesFlowStep {
  id: string;
  label: string;
}

export interface CesFlowProps {
  steps: CesFlowStep[];
  currentStepId: string;
  children: ReactNode;
}

export function CesFlow({ steps, currentStepId, children }: CesFlowProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStepId);

  return (
    <div className="kxd-ces-flow">
      <nav className="kxd-ces-flow__steps" aria-label="Progress">
        <ol className="kxd-ces-flow__step-list">
          {steps.map((step, index) => {
            const isComplete = index < currentIndex;
            const isCurrent = step.id === currentStepId;
            return (
              <li
                key={step.id}
                className={[
                  "kxd-ces-flow__step",
                  isComplete ? "kxd-ces-flow__step--complete" : "",
                  isCurrent ? "kxd-ces-flow__step--current" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span className="kxd-ces-flow__step-index" aria-hidden>
                  {index + 1}
                </span>
                <span className="kxd-ces-flow__step-label">{step.label}</span>
              </li>
            );
          })}
        </ol>
      </nav>
      <div className="kxd-ces-flow__body">{children}</div>
    </div>
  );
}
