import { z } from "zod"

// ─── Trigger schemas ──────────────────────────────────────────────────────────

export const ScoreThresholdTriggerSchema = z.object({
  type: z.literal("score_threshold"),
  operator: z.enum(["gte", "lte", "equals"]),
  score_value: z.number().min(0).max(100),
  sheet_id: z.string().optional(),
})

export const EnrichmentCompleteTriggerSchema = z.object({
  type: z.literal("enrichment_complete"),
  enrichment_column_id: z.string().optional(),
})

export const ManualTriggerSchema = z.object({
  type: z.literal("manual"),
})

export const ScheduleTriggerSchema = z.object({
  type: z.literal("schedule"),
  cron_expression: z.string(),
})

export const TriggerSchema = z.discriminatedUnion("type", [
  ScoreThresholdTriggerSchema,
  EnrichmentCompleteTriggerSchema,
  ManualTriggerSchema,
  ScheduleTriggerSchema,
])

export type Trigger = z.infer<typeof TriggerSchema>

// ─── Step schemas ─────────────────────────────────────────────────────────────

export const ActionConfigSchema = z.object({
  subject: z.string().optional(),
  body: z.string(),
  template_id: z.string().optional(),
  variables: z.record(z.string(), z.string()).optional(),
})

export const ConditionClauseSchema = z.object({
  field: z.string(),
  operator: z.enum(["equals", "not_equals", "contains", "gte", "lte", "exists"]),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
})

export const ActionStepSchema = z.object({
  id: z.string(),
  type: z.literal("action"),
  action_type: z.enum(["send_email", "linkedin_message", "linkedin_connect"]),
  config: ActionConfigSchema,
  next_step_id: z.string().nullable(),
})

export const ConditionStepSchema = z.object({
  id: z.string(),
  type: z.literal("condition"),
  operator: z.enum(["and", "or"]),
  conditions: z.array(ConditionClauseSchema),
  next_true_step_id: z.string(),
  next_false_step_id: z.string().nullable(),
})

export const DelayStepSchema = z.object({
  id: z.string(),
  type: z.literal("delay"),
  duration_ms: z.number().positive(),
  humanize_jitter: z.boolean().default(true),
  next_step_id: z.string(),
})

export const WorkflowStepSchema = z.discriminatedUnion("type", [
  ActionStepSchema,
  ConditionStepSchema,
  DelayStepSchema,
])

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>
export type ActionStep = z.infer<typeof ActionStepSchema>
export type ConditionStep = z.infer<typeof ConditionStepSchema>
export type DelayStep = z.infer<typeof DelayStepSchema>

// ─── Workflow schema ──────────────────────────────────────────────────────────

export const WorkflowSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string(),
  name: z.string().min(1),
  trigger: TriggerSchema,
  steps: z.array(WorkflowStepSchema),
  enabled: z.boolean().default(true),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
})

export type Workflow = z.infer<typeof WorkflowSchema>

export const CreateWorkflowSchema = WorkflowSchema.omit({
  id: true,
  project_id: true,
  created_at: true,
  updated_at: true,
})

// ─── Execution schemas ────────────────────────────────────────────────────────

export const ExecutionLogEntrySchema = z.object({
  step_id: z.string(),
  action: z.string(),
  timestamp: z.string().datetime(),
  result: z.any().optional(),
  error: z.string().optional(),
})

export const WorkflowExecutionSchema = z.object({
  id: z.string().uuid(),
  workflow_id: z.string().uuid(),
  sheet_row_id: z.string().uuid(),
  current_step_id: z.string().nullable(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  execution_log: z.array(ExecutionLogEntrySchema),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
})

export type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>

// ─── Outreach log schema ──────────────────────────────────────────────────────

export const OutreachChannelSchema = z.enum(["email", "linkedin_message", "linkedin_connect"])
export const OutreachActionSchema = z.enum(["send", "open", "reply", "bounce", "linkedin_viewed"])

export const OutreachLogSchema = z.object({
  id: z.string().uuid(),
  workflow_execution_id: z.string().uuid(),
  channel: OutreachChannelSchema,
  action: OutreachActionSchema,
  external_id: z.string().optional(),
  crm_sync_status: z.enum(["pending", "synced", "failed"]),
  metadata: z
    .object({
      subject: z.string().optional(),
      body: z.string().optional(),
      recipient_email: z.string().optional(),
      linkedin_profile: z.string().optional(),
      error_reason: z.string().optional(),
    })
    .optional(),
  created_at: z.string().datetime().optional(),
})

export type OutreachLog = z.infer<typeof OutreachLogSchema>
export type OutreachChannel = z.infer<typeof OutreachChannelSchema>

// ─── CRM activity sync schema ─────────────────────────────────────────────────

export const CRMActivitySchema = z.object({
  outreach_log_id: z.string().uuid(),
  sheet_row_id: z.string().uuid(),
  crm_connector_id: z.string(), // from integration registry
  activity_type: z.string(), // e.g. "email_sent", "linkedin_message", "engagement_open"
  external_reference: z.string().optional(),
  properties: z.record(z.string(), z.any()), // connector-specific mapped fields
  timestamp: z.string().datetime(),
})

export type CRMActivity = z.infer<typeof CRMActivitySchema>

// ─── Engagement webhook schema ────────────────────────────────────────────────

export const EngagementWebhookSchema = z.object({
  channel: OutreachChannelSchema,
  action: OutreachActionSchema,
  external_id: z.string(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.string(), z.any()).optional(),
})

export type EngagementWebhook = z.infer<typeof EngagementWebhookSchema>

// ─── Inngest event data schemas ───────────────────────────────────────────────

export const WorkflowTriggerEventSchema = z.object({
  workflow_id: z.string().uuid(),
  sheet_row_ids: z.array(z.string().uuid()),
  user_id: z.string(),
})

export const WorkflowExecuteEventSchema = z.object({
  execution_id: z.string().uuid(),
  user_id: z.string(),
})

export const OutreachSendEventSchema = z.object({
  execution_id: z.string().uuid(),
  step_id: z.string(),
  action_type: z.enum(["send_email", "linkedin_message", "linkedin_connect"]),
  config: ActionConfigSchema,
  lead_data: z.record(z.string(), z.any()),
  user_id: z.string(),
  crm_connector_id: z.string().optional(),
})

export const CRMSyncEventSchema = z.object({
  outreach_log_id: z.string().uuid(),
  sheet_row_id: z.string().uuid(),
  crm_connector_id: z.string(),
  user_id: z.string(),
})

export const EngagementTrackEventSchema = z.object({
  channel: OutreachChannelSchema,
  action: OutreachActionSchema,
  external_id: z.string(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.string(), z.any()).optional(),
  user_id: z.string(),
})
