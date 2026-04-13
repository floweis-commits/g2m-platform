/**
 * Workflow engine — evaluates triggers and executes DAG steps
 * Connector-agnostic: reads channel config from integration registry
 */

import type {
  Trigger,
  WorkflowStep,
  ConditionStep,
  ConditionClauseSchema,
} from "@/lib/workflows/schemas"
import type { z } from "zod"

type ConditionClause = z.infer<typeof ConditionClauseSchema>

// ─── Trigger evaluation ───────────────────────────────────────────────────────

/**
 * Check whether a lead row matches a given trigger condition.
 * Called by workflow.trigger Inngest function before creating executions.
 */
export function evaluateTrigger(
  trigger: Trigger,
  leadData: Record<string, unknown>,
): boolean {
  switch (trigger.type) {
    case "manual":
      return true

    case "score_threshold": {
      const score = Number(leadData.score ?? 0)
      switch (trigger.operator) {
        case "gte":
          return score >= trigger.score_value
        case "lte":
          return score <= trigger.score_value
        case "equals":
          return score === trigger.score_value
      }
    }

    case "enrichment_complete": {
      if (trigger.enrichment_column_id) {
        const enrichmentData = leadData.enrichment_data as Record<string, unknown> | undefined
        return !!enrichmentData?.[trigger.enrichment_column_id]
      }
      // If no specific column, just check that any enrichment exists
      return !!leadData.enrichment_data
    }

    case "schedule":
      // Schedules are handled by Inngest cron triggers — always eligible here
      return true

    default:
      return false
  }
}

// ─── Condition step evaluation ────────────────────────────────────────────────

/**
 * Evaluate a condition step against lead data.
 * Returns true if the condition is met (follow next_true_step_id), false otherwise.
 */
export function evaluateCondition(
  step: ConditionStep,
  leadData: Record<string, unknown>,
): boolean {
  const results = step.conditions.map((clause) =>
    evaluateClause(clause, leadData),
  )

  return step.operator === "and"
    ? results.every(Boolean)
    : results.some(Boolean)
}

function evaluateClause(
  clause: ConditionClause,
  leadData: Record<string, unknown>,
): boolean {
  const fieldValue = getFieldValue(leadData, clause.field)

  switch (clause.operator) {
    case "exists":
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== ""

    case "equals":
      return String(fieldValue) === String(clause.value)

    case "not_equals":
      return String(fieldValue) !== String(clause.value)

    case "contains":
      return String(fieldValue ?? "")
        .toLowerCase()
        .includes(String(clause.value ?? "").toLowerCase())

    case "gte":
      return Number(fieldValue) >= Number(clause.value)

    case "lte":
      return Number(fieldValue) <= Number(clause.value)

    default:
      return false
  }
}

function getFieldValue(
  data: Record<string, unknown>,
  field: string,
): unknown {
  // Support dot-notation: "enrichment_data.funding_stage"
  const parts = field.split(".")
  let current: unknown = data
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

// ─── Delay jitter ─────────────────────────────────────────────────────────────

/**
 * Apply ±10% jitter to a delay to simulate human-like pacing.
 */
export function applyJitter(durationMs: number): number {
  const jitter = durationMs * 0.1
  const offset = (Math.random() * 2 - 1) * jitter // -10% to +10%
  return Math.max(0, Math.round(durationMs + offset))
}

// ─── Next step resolution ─────────────────────────────────────────────────────

export interface StepResult {
  nextStepId: string | null
  skipDelay?: number // ms to wait before next step
}

/**
 * Given a completed step and (for conditions) the evaluation result,
 * return the ID of the next step to execute.
 */
export function resolveNextStep(
  step: WorkflowStep,
  conditionResult?: boolean,
): StepResult {
  switch (step.type) {
    case "action":
      return { nextStepId: step.next_step_id }

    case "condition":
      return {
        nextStepId: conditionResult
          ? step.next_true_step_id
          : (step.next_false_step_id ?? null),
      }

    case "delay": {
      const delayMs = step.humanize_jitter
        ? applyJitter(step.duration_ms)
        : step.duration_ms
      return {
        nextStepId: step.next_step_id,
        skipDelay: delayMs,
      }
    }
  }
}
