import { inngest } from "@/lib/inngest/client"
import { scoreBatch } from "@/lib/engines/scoring-engine"
import { enrichColumn } from "@/lib/engines/enrichment-router"
import {
  fetchCrmSchema,
  exportLeads,
  validateFieldMapping,
} from "@/lib/services/integrations/crm-export"
import { createClient } from "@/lib/supabase/server"

// Function 1: Scoring batch
export const scoringBatch = inngest.createFunction(
  {
    id: "scoring.batch",
    triggers: [{ event: "scoring/batch" }],
    rateLimit: {
      limit: 10,
      period: "1m",
    },
  },
  async ({ event, step }: any) => {
    const { sheetId, userId, projectIcp } = event.data

    // Step 1: Fetch leads for sheet
    const leads = await step.run("fetch-leads", async () => {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from("leads")
        .select(
          "id, company_name, description, industry, employee_count, funding_stage, funding_amount",
        )
        .eq("sheet_id", sheetId)
        .eq("user_id", userId)

      if (error) {
        throw new Error(`Failed to fetch leads: ${error.message}`)
      }

      return data || []
    })

    // Step 2: Score leads in parallel batches of 5
    await step.run("score-leads", async () => {
      const batchSize = 5
      for (let i = 0; i < leads.length; i += batchSize) {
        const batch = leads.slice(i, i + batchSize)
        await Promise.all(
          batch.map((lead: any) =>
            scoreBatch(sheetId, [lead], projectIcp, userId),
          ),
        )
      }
    })

    // Step 3: Update sheet status
    await step.run("update-sheet-status", async () => {
      const supabase = await createClient()
      const { error } = await supabase
        .from("sheets")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", sheetId)
        .eq("user_id", userId)

      if (error) {
        console.error("Error updating sheet status:", error)
      }
    })

    return { success: true, leadsScored: leads.length }
  },
)

// Function 2: Enrichment run column
export const enrichmentRunColumn = inngest.createFunction(
  {
    id: "enrichment.run-column",
    triggers: [{ event: "enrichment/run-column" }],
    rateLimit: {
      limit: 5,
      period: "1m",
    },
  },
  async ({ event, step }: any) => {
    const { sheetId, columnConfig, userId } = event.data

    // Step 1: Fetch leads for sheet
    const leads = await step.run("fetch-leads", async () => {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from("leads")
        .select(
          "id, company_name, description, industry, employee_count, funding_stage, domain, enrichment_data",
        )
        .eq("sheet_id", sheetId)
        .eq("user_id", userId)

      if (error) {
        throw new Error(`Failed to fetch leads: ${error.message}`)
      }

      return data || []
    })

    // Step 2: Enrich each lead sequentially
    const enrichedCount = await step.run("enrich-leads", async () => {
      let successCount = 0
      for (const lead of leads) {
        try {
          await enrichColumn(sheetId, lead.id, columnConfig, userId)
          successCount++
        } catch (error) {
          console.error(`Failed to enrich lead ${lead.id}:`, error)
        }
      }
      return successCount
    })

    // Step 3: Update sheet column config
    await step.run("update-sheet-config", async () => {
      const supabase = await createClient()

      const { data: sheet, error: fetchError } = await supabase
        .from("sheets")
        .select("column_config")
        .eq("id", sheetId)
        .eq("user_id", userId)
        .single()

      if (fetchError) {
        console.error("Error fetching sheet:", fetchError)
        return
      }

      const currentConfig = sheet?.column_config || []
      const columnIndex = currentConfig.findIndex(
        (c: any) => c.name === columnConfig.name,
      )

      if (columnIndex === -1) {
        currentConfig.push(columnConfig)
      } else {
        currentConfig[columnIndex] = columnConfig
      }

      const { error: updateError } = await supabase
        .from("sheets")
        .update({
          column_config: currentConfig,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sheetId)
        .eq("user_id", userId)

      if (updateError) {
        console.error("Error updating sheet config:", updateError)
      }
    })

    return { success: true, leadsEnriched: enrichedCount }
  },
)

// Function 3: CRM export sync
export const exportCrmSync = inngest.createFunction(
  {
    id: "export.crm-sync",
    triggers: [{ event: "export/crm-sync" }],
  },
  async ({ event, step }: any) => {
    const { sheetId, crmIntegrationId, fieldMapping, userId } = event.data

    // Step 1: Fetch leads for sheet
    const leads = await step.run("fetch-leads", async () => {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from("leads")
        .select(
          "id, company_name, domain, description, industry, employee_count, funding_stage, funding_amount, score",
        )
        .eq("sheet_id", sheetId)
        .eq("user_id", userId)

      if (error) {
        throw new Error(`Failed to fetch leads: ${error.message}`)
      }

      return data || []
    })

    // Step 2: Fetch CRM schema
    const schema = await step.run("fetch-crm-schema", async () => {
      // In a real implementation, we'd fetch the access token from user_integrations
      return await fetchCrmSchema(crmIntegrationId)
    })

    // Step 3: Validate field mapping
    const validationResult = await step.run("validate-mapping", async () => {
      return validateFieldMapping(fieldMapping, schema)
    })

    if (!validationResult.valid) {
      return {
        success: false,
        error: `Field mapping validation failed: ${validationResult.errors.join(", ")}`,
      }
    }

    // Step 4: Batch export
    const exportResult = await step.run("export-leads", async () => {
      // In a real implementation, we'd fetch the access token from user_integrations
      return await exportLeads(crmIntegrationId, leads, fieldMapping)
    })

    // Step 5: Update lead status for exported ones
    await step.run("update-lead-status", async () => {
      const supabase = await createClient()

      // Mark successfully exported leads
      const successfulLeadIds = leads
        .filter(
          (lead: any) =>
            !exportResult.errors.find((e: any) => e.leadId === lead.id),
        )
        .map((lead: any) => lead.id)

      if (successfulLeadIds.length > 0) {
        const { error } = await supabase
          .from("leads")
          .update({
            status: "exported",
            updated_at: new Date().toISOString(),
          })
          .in("id", successfulLeadIds)
          .eq("user_id", userId)

        if (error) {
          console.error("Error updating lead status:", error)
        }
      }
    })

    return {
      success: true,
      ...exportResult,
    }
  },
)
