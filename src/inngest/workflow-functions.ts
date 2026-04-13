/**
 * Phase 3 Inngest functions — Workflow Engine + Outreach Orchestration
 *
 * Functions:
 *   workflow.trigger         → evaluate trigger, create executions
 *   workflow.execute         → step-by-step DAG execution
 *   outreach.send_email      → send email via connected provider
 *   outreach.linkedin_message → send LinkedIn message
 *   outreach.linkedin_connect → send LinkedIn connection request
 *   crm.sync_activity        → log outreach action to connected CRM (connector-agnostic)
 *   engagement.track         → process engagement webhooks (open, reply, view)
 */

import { inngest } from "@/lib/inngest/client"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  evaluateTrigger,
  evaluateCondition,
  resolveNextStep,
  applyJitter,
} from "@/lib/engines/workflow-engine"
import { sendEmail } from "@/lib/services/outreach/email"
import { sendLinkedInMessage, sendLinkedInConnect } from "@/lib/services/outreach/linkedin"
import type { WorkflowStep, ActionStep } from "@/lib/workflows/schemas"

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAccessToken(
  userId: string,
  integrationId: string,
): Promise<string | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("user_integrations")
    .select("access_token")
    .eq("user_id", userId)
    .eq("integration_id", integrationId)
    .single()
  return data?.access_token ?? null
}

async function appendExecutionLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  executionId: string,
  entry: {
    step_id: string
    action: string
    result?: unknown
    error?: string
  },
) {
  const { data: exec } = await supabase
    .from("workflow_executions")
    .select("execution_log")
    .eq("id", executionId)
    .single()

  const log = Array.isArray(exec?.execution_log) ? exec.execution_log : []
  log.push({
    ...entry,
    timestamp: new Date().toISOString(),
  })

  await supabase
    .from("workflow_executions")
    .update({ execution_log: log, updated_at: new Date().toISOString() })
    .eq("id", executionId)
}

// ─── 1. workflow.trigger ──────────────────────────────────────────────────────

export const workflowTrigger = inngest.createFunction(
  {
    id: "workflow.trigger",
    triggers: [{ event: "workflow/trigger" }],
    concurrency: { limit: 5 },
    retries: 3,
  },
  async ({ event, step }: any) => {
    const { workflow_id, sheet_row_ids, user_id } = event.data

    // Fetch workflow
    const workflow = await step.run("fetch-workflow", async () => {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from("workflows")
        .select("*")
        .eq("id", workflow_id)
        .single()
      if (error) throw new Error(`Workflow not found: ${error.message}`)
      return data
    })

    if (!workflow.enabled) {
      return { skipped: true, reason: "Workflow is disabled" }
    }

    // Fetch lead data + evaluate trigger for each row
    const executions = await step.run("create-executions", async () => {
      const supabase = await createClient()
      const { data: leads } = await supabase
        .from("leads")
        .select("*")
        .in("id", sheet_row_ids)
        .eq("user_id", user_id)

      const created = []
      for (const lead of leads ?? []) {
        const matches = evaluateTrigger(workflow.trigger, lead)
        if (!matches) continue

        const firstStep = Array.isArray(workflow.steps) ? workflow.steps[0] : null
        const { data: exec, error } = await supabase
          .from("workflow_executions")
          .insert({
            workflow_id,
            sheet_row_id: lead.id,
            current_step_id: firstStep?.id ?? null,
            status: "pending",
            execution_log: [],
          })
          .select()
          .single()

        if (error) {
          console.error(`Failed to create execution for lead ${lead.id}:`, error)
          continue
        }
        created.push(exec)
      }
      return created
    })

    // Enqueue workflow.execute for each created execution
    await step.run("enqueue-executions", async () => {
      for (const exec of executions) {
        await inngest.send({
          name: "workflow/execute",
          data: { execution_id: exec.id, user_id },
        })
      }
    })

    return { created: executions.length }
  },
)

// ─── 2. workflow.execute ──────────────────────────────────────────────────────

export const workflowExecute = inngest.createFunction(
  {
    id: "workflow.execute",
    triggers: [{ event: "workflow/execute" }],
    concurrency: { limit: 10 },
    retries: 3,
  },
  async ({ event, step }: any) => {
    const { execution_id, user_id } = event.data

    // Fetch execution + workflow + lead
    const context = await step.run("fetch-context", async () => {
      const supabase = await createClient()
      const { data: exec, error: execError } = await supabase
        .from("workflow_executions")
        .select("*, workflows(*)")
        .eq("id", execution_id)
        .single()
      if (execError) throw new Error(`Execution not found: ${execError.message}`)

      const { data: lead } = await supabase
        .from("leads")
        .select("*")
        .eq("id", exec.sheet_row_id)
        .single()

      return { exec, workflow: exec.workflows, lead }
    })

    const { exec, workflow, lead } = context

    if (exec.status === "completed" || exec.status === "failed") {
      return { skipped: true, reason: `Execution already ${exec.status}` }
    }

    // Find current step in workflow DAG
    const steps: WorkflowStep[] = workflow.steps ?? []
    const currentStep = steps.find((s: WorkflowStep) => s.id === exec.current_step_id)

    if (!currentStep) {
      // No more steps — mark completed
      const supabase = await createClient()
      await supabase
        .from("workflow_executions")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", execution_id)
      return { completed: true }
    }

    // Mark as running
    const supabase = await createClient()
    await supabase
      .from("workflow_executions")
      .update({ status: "running", updated_at: new Date().toISOString() })
      .eq("id", execution_id)

    // Execute the step
    let nextStepId: string | null = null
    let delayMs: number | null = null

    if (currentStep.type === "action") {
      await step.run("enqueue-outreach", async () => {
        // Route to the correct outreach event based on action_type
        const eventName = {
          send_email: "outreach/send_email",
          linkedin_message: "outreach/linkedin_message",
          linkedin_connect: "outreach/linkedin_connect",
        }[currentStep.action_type] ?? "outreach/send_email"

        await inngest.send({
          name: eventName,
          data: {
            execution_id,
            step_id: currentStep.id,
            action_type: currentStep.action_type,
            config: currentStep.config,
            lead_data: lead,
            user_id,
          },
        })
      })
      nextStepId = currentStep.next_step_id
    } else if (currentStep.type === "condition") {
      const result = evaluateCondition(currentStep, lead ?? {})
      const resolved = resolveNextStep(currentStep, result)
      nextStepId = resolved.nextStepId
      await appendExecutionLog(supabase, execution_id, {
        step_id: currentStep.id,
        action: `condition_evaluated:${result}`,
      })
    } else if (currentStep.type === "delay") {
      const resolved = resolveNextStep(currentStep)
      nextStepId = resolved.nextStepId
      delayMs = resolved.skipDelay ?? currentStep.duration_ms
      await appendExecutionLog(supabase, execution_id, {
        step_id: currentStep.id,
        action: `delay_start:${delayMs}ms`,
      })
    }

    // Update current step and schedule next
    await supabase
      .from("workflow_executions")
      .update({ current_step_id: nextStepId, updated_at: new Date().toISOString() })
      .eq("id", execution_id)

    if (nextStepId) {
      await step.run("schedule-next", async () => {
        if (delayMs && delayMs > 0) {
          await inngest.send({
            name: "workflow/execute",
            data: { execution_id, user_id },
            ts: Date.now() + delayMs,
          })
        } else {
          await inngest.send({
            name: "workflow/execute",
            data: { execution_id, user_id },
          })
        }
      })
    } else {
      // No next step — completed
      await supabase
        .from("workflow_executions")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", execution_id)
    }

    return { step_executed: currentStep.id, next_step: nextStepId }
  },
)

// ─── 3. outreach.send_email ───────────────────────────────────────────────────

export const outreachSendEmail = inngest.createFunction(
  {
    id: "outreach.send_email",
    triggers: [{ event: "outreach/send_email" }],
    rateLimit: { limit: 5, period: "1m" },
    retries: 3,
  },
  async ({ event, step }: any) => {
    const { execution_id, step_id, config, lead_data, user_id } = event.data

    const result = await step.run("send-email", async () => {
      const accessToken = await getAccessToken(user_id, "gmail")
      if (!accessToken) {
        return { success: false, error: "Gmail not connected" }
      }
      return sendEmail({ config, leadData: lead_data, accessToken })
    })

    // Log to outreach_logs
    await step.run("log-outreach", async () => {
      const supabase = await createClient()
      const { data: log } = await supabase
        .from("outreach_logs")
        .insert({
          workflow_execution_id: execution_id,
          channel: "email",
          action: "send",
          external_id: result.external_id,
          crm_sync_status: "pending",
          metadata: {
            subject: config.subject,
            recipient_email: lead_data.email ?? lead_data.contact_email,
            error_reason: result.error,
          },
        })
        .select()
        .single()

      if (log) {
        // Enqueue CRM sync
        const connectedCrm = await getConnectedCRM(user_id)
        if (connectedCrm) {
          await inngest.send({
            name: "crm/sync_activity",
            data: {
              outreach_log_id: log.id,
              sheet_row_id: lead_data.id,
              crm_connector_id: connectedCrm,
              user_id,
            },
          })
        }
      }

      // Append to execution log
      const supabase2 = await createClient()
      await appendExecutionLog(supabase2, execution_id, {
        step_id,
        action: "send_email",
        result: { success: result.success, external_id: result.external_id },
        error: result.error,
      })
    })

    if (!result.success) {
      throw new Error(result.error ?? "Email send failed")
    }

    return result
  },
)

// ─── 4. outreach.linkedin_message ────────────────────────────────────────────

export const outreachLinkedInMessage = inngest.createFunction(
  {
    id: "outreach.linkedin_message",
    triggers: [{ event: "outreach/linkedin_message" }],
    rateLimit: { limit: 50, period: "1d" },
    retries: 3,
  },
  async ({ event, step }: any) => {
    const { execution_id, step_id, config, lead_data, user_id } = event.data

    const result = await step.run("send-linkedin-message", async () => {
      const accessToken = await getAccessToken(user_id, "linkedin")
      if (!accessToken) {
        return { success: false, error: "LinkedIn not connected" }
      }
      return sendLinkedInMessage({ config, leadData: lead_data, accessToken })
    })

    await step.run("log-outreach", async () => {
      const supabase = await createClient()
      const { data: log } = await supabase
        .from("outreach_logs")
        .insert({
          workflow_execution_id: execution_id,
          channel: "linkedin_message",
          action: "send",
          external_id: result.external_id,
          crm_sync_status: "pending",
          metadata: {
            linkedin_profile: lead_data.linkedin_url ?? lead_data.linkedin_profile,
            error_reason: result.error,
          },
        })
        .select()
        .single()

      if (log) {
        const connectedCrm = await getConnectedCRM(user_id)
        if (connectedCrm) {
          await inngest.send({
            name: "crm/sync_activity",
            data: {
              outreach_log_id: log.id,
              sheet_row_id: lead_data.id,
              crm_connector_id: connectedCrm,
              user_id,
            },
          })
        }
      }

      const supabase2 = await createClient()
      await appendExecutionLog(supabase2, execution_id, {
        step_id,
        action: "linkedin_message",
        result: { success: result.success, external_id: result.external_id },
        error: result.error,
      })
    })

    if (result.rate_limited) {
      // Requeue for tomorrow
      const retryMs = result.retry_after_ms ?? 86400000
      await inngest.send({
        name: "outreach/linkedin_message",
        data: event.data,
        ts: Date.now() + retryMs,
      })
      return { queued_for_retry: true, retry_after_ms: retryMs }
    }

    if (!result.success) {
      throw new Error(result.error ?? "LinkedIn message failed")
    }

    return result
  },
)

// ─── 5. outreach.linkedin_connect ────────────────────────────────────────────

export const outreachLinkedInConnect = inngest.createFunction(
  {
    id: "outreach.linkedin_connect",
    triggers: [{ event: "outreach/linkedin_connect" }],
    rateLimit: { limit: 20, period: "1d" },
    retries: 3,
  },
  async ({ event, step }: any) => {
    const { execution_id, step_id, config, lead_data, user_id } = event.data

    const result = await step.run("send-connection-request", async () => {
      const accessToken = await getAccessToken(user_id, "linkedin")
      if (!accessToken) {
        return { success: false, error: "LinkedIn not connected" }
      }
      return sendLinkedInConnect({ config, leadData: lead_data, accessToken })
    })

    await step.run("log-outreach", async () => {
      const supabase = await createClient()
      const { data: log } = await supabase
        .from("outreach_logs")
        .insert({
          workflow_execution_id: execution_id,
          channel: "linkedin_connect",
          action: "send",
          external_id: result.external_id,
          crm_sync_status: "pending",
          metadata: {
            linkedin_profile: lead_data.linkedin_url ?? lead_data.linkedin_profile,
            error_reason: result.error,
          },
        })
        .select()
        .single()

      if (log) {
        const connectedCrm = await getConnectedCRM(user_id)
        if (connectedCrm) {
          await inngest.send({
            name: "crm/sync_activity",
            data: {
              outreach_log_id: log.id,
              sheet_row_id: lead_data.id,
              crm_connector_id: connectedCrm,
              user_id,
            },
          })
        }
      }

      const supabase2 = await createClient()
      await appendExecutionLog(supabase2, execution_id, {
        step_id,
        action: "linkedin_connect",
        result: { success: result.success, external_id: result.external_id },
        error: result.error,
      })
    })

    if (result.rate_limited) {
      const retryMs = result.retry_after_ms ?? 86400000
      await inngest.send({
        name: "outreach/linkedin_connect",
        data: event.data,
        ts: Date.now() + retryMs,
      })
      return { queued_for_retry: true }
    }

    return result
  },
)

// ─── 6. crm.sync_activity (connector-agnostic) ───────────────────────────────

export const crmSyncActivity = inngest.createFunction(
  {
    id: "crm.sync_activity",
    triggers: [{ event: "crm/sync_activity" }],
    retries: 5,
  },
  async ({ event, step, attempt }: any) => {
    const { outreach_log_id, sheet_row_id, crm_connector_id, user_id } = event.data

    // Fetch outreach log + lead data
    const context = await step.run("fetch-context", async () => {
      const supabase = await createClient()
      const [{ data: log }, { data: lead }] = await Promise.all([
        supabase.from("outreach_logs").select("*").eq("id", outreach_log_id).single(),
        supabase.from("leads").select("*").eq("id", sheet_row_id).single(),
      ])
      return { log, lead }
    })

    const { log, lead } = context
    if (!log) throw new Error("Outreach log not found")

    // Get access token for this CRM
    const accessToken = await getAccessToken(user_id, crm_connector_id)
    if (!accessToken) {
      await markCrmSyncFailed(outreach_log_id, "CRM not connected")
      return { success: false, error: "CRM not connected" }
    }

    // Map outreach log to CRM activity using connector's field mapping
    const activityPayload = buildCRMActivity(log, lead, crm_connector_id)

    // Call the CRM connector's activity endpoint
    const syncResult = await step.run("sync-to-crm", async () => {
      return callCRMActivityAPI(crm_connector_id, activityPayload, accessToken)
    })

    // Update sync status
    await step.run("update-sync-status", async () => {
      const supabase = await createClient()
      await supabase
        .from("outreach_logs")
        .update({
          crm_sync_status: syncResult.success ? "synced" : "failed",
        })
        .eq("id", outreach_log_id)
    })

    return syncResult
  },
)

// ─── 7. engagement.track ─────────────────────────────────────────────────────

export const engagementTrack = inngest.createFunction(
  {
    id: "engagement.track",
    triggers: [{ event: "engagement/track" }],
    retries: 3,
  },
  async ({ event, step }: any) => {
    const { channel, action, external_id, timestamp, metadata, user_id } = event.data

    // Find matching outreach_log by external_id
    const log = await step.run("find-outreach-log", async () => {
      const supabase = await createClient()
      const { data } = await supabase
        .from("outreach_logs")
        .select("*")
        .eq("external_id", external_id)
        .single()
      return data
    })

    if (!log) {
      console.warn(`No outreach log found for external_id: ${external_id}`)
      return { skipped: true }
    }

    // Append engagement action to log
    await step.run("append-engagement", async () => {
      const supabase = await createClient()
      await supabase.from("outreach_logs").insert({
        workflow_execution_id: log.workflow_execution_id,
        channel,
        action,
        external_id,
        crm_sync_status: "pending",
        metadata: metadata ?? {},
      })
    })

    // Sync engagement to CRM
    await step.run("enqueue-crm-sync", async () => {
      const connectedCrm = await getConnectedCRM(user_id)
      if (!connectedCrm) return

      const { data: exec } = await (await createClient())
        .from("workflow_executions")
        .select("sheet_row_id")
        .eq("id", log.workflow_execution_id)
        .single()

      if (exec) {
        await inngest.send({
          name: "crm/sync_activity",
          data: {
            outreach_log_id: log.id,
            sheet_row_id: exec.sheet_row_id,
            crm_connector_id: connectedCrm,
            user_id,
          },
        })
      }
    })

    return { tracked: true, action, channel }
  },
)

// ─── CRM connector-agnostic helpers ──────────────────────────────────────────

/**
 * Returns the first connected CRM for this user (from user_integrations).
 * Future: support multi-CRM by letting user choose per workflow.
 */
async function getConnectedCRM(userId: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("user_integrations")
    .select("integration_id")
    .eq("user_id", userId)
    .in("integration_id", ["hubspot", "salesforce", "pipedrive", "attio"])
    .limit(1)
    .single()
  return data?.integration_id ?? null
}

/**
 * Build CRM activity payload by mapping outreach log fields.
 * Each CRM connector defines its own activity_type and field mapping.
 * This is the connector-agnostic mapping layer.
 */
function buildCRMActivity(
  log: Record<string, unknown>,
  lead: Record<string, unknown> | null,
  crmId: string,
): Record<string, unknown> {
  const base = {
    outreach_log_id: log.id,
    channel: log.channel,
    action: log.action,
    timestamp: log.created_at ?? new Date().toISOString(),
    lead_email: lead?.email ?? lead?.contact_email,
    lead_name: lead?.company_name,
    metadata: log.metadata,
  }

  // Connector-specific field mapping
  switch (crmId) {
    case "hubspot":
      return {
        ...base,
        hs_activity_type: mapChannelToHubSpot(String(log.action), String(log.channel)),
        hs_timestamp: base.timestamp,
        hs_body: (log.metadata as any)?.body ?? "",
      }
    case "salesforce":
      return {
        ...base,
        sf_task_subject: `[G2M] ${log.channel} - ${log.action}`,
        sf_task_type: "Email",
      }
    case "pipedrive":
    case "attio":
    default:
      return base
  }
}

function mapChannelToHubSpot(action: string, channel: string): string {
  if (channel === "email" && action === "send") return "SEND_EMAIL"
  if (channel === "email" && action === "reply") return "INCOMING_EMAIL"
  if (channel.startsWith("linkedin")) return "NOTE"
  return "TASK"
}

async function callCRMActivityAPI(
  crmId: string,
  payload: Record<string, unknown>,
  accessToken: string,
): Promise<{ success: boolean; error?: string }> {
  // Each connector has its own endpoint — stubbed here for extensibility
  const endpoints: Record<string, string> = {
    hubspot: "https://api.hubapi.com/engagements/v1/engagements",
    salesforce: "https://your-domain.salesforce.com/services/data/v58.0/sobjects/Task",
    pipedrive: "https://api.pipedrive.com/v1/activities",
    attio: "https://api.attio.com/v2/notes",
  }

  const endpoint = endpoints[crmId]
  if (!endpoint) {
    return { success: false, error: `No endpoint for CRM: ${crmId}` }
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

async function markCrmSyncFailed(logId: string, reason: string) {
  const supabase = await createClient()
  await supabase
    .from("outreach_logs")
    .update({ crm_sync_status: "failed" })
    .eq("id", logId)
}
