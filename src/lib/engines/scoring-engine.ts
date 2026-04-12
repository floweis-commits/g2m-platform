import { z } from "zod"

import { getModel } from "@/lib/ai/model-router"
import { callLLM } from "@/lib/services/api-service"
import { createClient } from "@/lib/supabase/server"

const ScoringOutputSchema = z.object({
  signals: z.array(
    z.object({
      name: z.string(),
      score: z.number().min(0).max(10),
      reasoning: z.string(),
    }),
  ),
  composite_score: z.number().min(0).max(100),
  summary: z.string(),
  priority: z.enum(["high", "medium", "low"]),
})

export type ScoringOutput = z.infer<typeof ScoringOutputSchema>

const DEFAULT_SCORING_CRITERIA = [
  { name: "icp_match", weight: 0.3 },
  { name: "funding_fit", weight: 0.2 },
  { name: "size_fit", weight: 0.2 },
  { name: "growth_signal", weight: 0.15 },
  { name: "market_timing", weight: 0.15 },
]

interface Lead {
  id: string
  company_name: string
  description?: string
  industry?: string
  employee_count?: string
  funding_stage?: string
  funding_amount?: number
}

export async function scoreLead(
  lead: Lead,
  projectIcp: string,
  scoringCriteria: typeof DEFAULT_SCORING_CRITERIA,
  userId: string,
): Promise<ScoringOutput> {
  const model = getModel("bulkScoring")

  const criteriaText = scoringCriteria
    .map((c) => `- ${c.name} (weight: ${c.weight})`)
    .join("\n")

  const prompt = `You are an expert B2B lead scoring system. Score this lead against the ICP and criteria provided.

Company Name: ${lead.company_name}
Description: ${lead.description || "N/A"}
Industry: ${lead.industry || "N/A"}
Employee Count: ${lead.employee_count || "N/A"}
Funding Stage: ${lead.funding_stage || "N/A"}
Funding Amount: ${lead.funding_amount ? `$${lead.funding_amount}` : "N/A"}

ICP Description:
${projectIcp}

Scoring Criteria (with weights):
${criteriaText}

Provide a detailed scoring breakdown:
1. Rate each signal on a scale of 0-10
2. Provide reasoning for each score
3. Calculate a composite score (0-100) based on the weighted signals
4. Provide a brief summary
5. Recommend priority level (high/medium/low)

Return valid JSON only, no additional text.`

  const result = await callLLM(
    "bulkScoring",
    prompt,
    ScoringOutputSchema,
  )

  return result
}

export async function scoreBatch(
  sheetId: string,
  leads: Lead[],
  projectIcp: string,
  userId: string,
): Promise<void> {
  const supabase = await createClient()

  // Fetch or create scoring criteria
  const { data: existingCriteria, error: criteriaError } = await supabase
    .from("scoring_criteria")
    .select("criteria")
    .eq("sheet_id", sheetId)
    .eq("user_id", userId)
    .single()

  let criteria = DEFAULT_SCORING_CRITERIA

  if (!existingCriteria) {
    // Create default criteria
    const { error: insertError } = await supabase
      .from("scoring_criteria")
      .insert({
        sheet_id: sheetId,
        user_id: userId,
        criteria: DEFAULT_SCORING_CRITERIA,
      })

    if (insertError) {
      console.error("Error creating default scoring criteria:", insertError)
    }
  } else {
    criteria = existingCriteria.criteria
  }

  // Score each lead
  for (const lead of leads) {
    try {
      const scoring = await scoreLead(
        lead,
        projectIcp,
        criteria,
        userId,
      )

      // Update lead with scoring results
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          score: Math.round(scoring.composite_score),
          score_reasoning: scoring.summary,
          score_breakdown: {
            signals: scoring.signals,
            priority: scoring.priority,
          },
          status: "enriched",
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id)
        .eq("user_id", userId)

      if (updateError) {
        console.error(`Error updating score for lead ${lead.id}:`, updateError)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      console.error(`Error scoring lead ${lead.id}:`, error)

      // Mark lead as failed
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          status: "enrichment_failed",
          score_reasoning: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id)
        .eq("user_id", userId)

      if (updateError) {
        console.error(`Error updating lead status for ${lead.id}:`, updateError)
      }
    }
  }
}
