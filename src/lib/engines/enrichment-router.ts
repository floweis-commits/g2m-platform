import { z } from "zod"

import { getModel } from "@/lib/ai/model-router"
import { callLLM } from "@/lib/services/api-service"
import {
  getIntegrationsByCategory,
  isConnected,
} from "@/lib/services/integrations/registry"
import { createClient } from "@/lib/supabase/server"

const EnrichmentOutputSchema = z.object({
  tool_used: z.string().nullable(),
  value: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
})

export type EnrichmentOutput = z.infer<typeof EnrichmentOutputSchema>

interface ColumnConfig {
  name: string
  prompt: string
  toolHint?: string
}

interface Lead {
  id: string
  company_name: string
  description?: string
  industry?: string
  employee_count?: string
  funding_stage?: string
  domain?: string
  enrichment_data?: Record<string, any>
}

export async function enrichLead(
  lead: Lead,
  columnConfig: ColumnConfig,
  availableTools: Array<{ id: string; name: string }>,
  userId: string,
): Promise<EnrichmentOutput> {
  const model = getModel("enrichmentCells")

  const toolsText = availableTools
    .map((t) => `- ${t.name} (${t.id})`)
    .join("\n")

  const leadData = `
Company: ${lead.company_name}
Domain: ${lead.domain || "N/A"}
Description: ${lead.description || "N/A"}
Industry: ${lead.industry || "N/A"}
Employees: ${lead.employee_count || "N/A"}
Funding: ${lead.funding_stage || "N/A"}
`.trim()

  const prompt = `You are an AI enrichment system. Given this company data and a task, determine:
1. Which tool (if any) would best answer the question
2. What value to return based on available context or tool selection

Company Data:
${leadData}

Task: ${columnConfig.prompt}
${columnConfig.toolHint ? `Hint: ${columnConfig.toolHint}` : ""}

Available Tools:
${toolsText}

If no tool is suitable or you can answer from context, set tool_used to null.
Provide your best answer based on available data and selected tool.

Return valid JSON only with: { "tool_used": null|string, "value": string, "confidence": "high"|"medium"|"low" }`

  const result = await callLLM(
    "enrichmentCells",
    prompt,
    EnrichmentOutputSchema,
  )

  return result
}

export async function enrichColumn(
  sheetId: string,
  leadId: string,
  columnConfig: ColumnConfig,
  userId: string,
): Promise<void> {
  const supabase = await createClient()

  try {
    // Fetch lead data
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select(
        "id, company_name, description, industry, employee_count, funding_stage, domain, enrichment_data",
      )
      .eq("id", leadId)
      .eq("user_id", userId)
      .single()

    if (leadError || !lead) {
      throw new Error(`Lead not found: ${leadError?.message || "Unknown error"}`)
    }

    // Update status to enriching
    await supabase
      .from("leads")
      .update({
        status: "enriching",
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .eq("user_id", userId)

    // Get available enrichment tools
    const enrichmentIntegrations = getIntegrationsByCategory("enrichment")

    // Fetch user integrations to check what's connected
    const { data: userIntegrations, error: integrationsError } = await supabase
      .from("user_integrations")
      .select("integration_id")
      .eq("user_id", userId)

    if (integrationsError) {
      throw new Error(
        `Failed to fetch integrations: ${integrationsError.message}`,
      )
    }

    const availableTools = enrichmentIntegrations
      .filter((integration) =>
        isConnected(integration.id, userIntegrations || []),
      )
      .map((integration) => ({
        id: integration.id,
        name: integration.name,
      }))

    // Call enrichment router
    const enrichmentResult = await enrichLead(
      lead,
      columnConfig,
      availableTools,
      userId,
    )

    // Merge with existing enrichment data
    const existingEnrichment = lead.enrichment_data || {}
    const updatedEnrichment = {
      ...existingEnrichment,
      [columnConfig.name]: {
        value: enrichmentResult.value,
        tool_used: enrichmentResult.tool_used,
        confidence: enrichmentResult.confidence,
        enriched_at: new Date().toISOString(),
      },
    }

    // Update lead with enrichment result
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        enrichment_data: updatedEnrichment,
        status: "enriched",
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .eq("user_id", userId)

    if (updateError) {
      throw new Error(`Failed to update lead: ${updateError.message}`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error(`Error enriching lead ${leadId}:`, error)

    // Mark as failed
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        status: "enrichment_failed",
        score_reasoning: `Enrichment failed: ${errorMessage}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .eq("user_id", userId)

    if (updateError) {
      console.error(
        `Error updating lead status for ${leadId}:`,
        updateError,
      )
    }

    throw error
  }
}
