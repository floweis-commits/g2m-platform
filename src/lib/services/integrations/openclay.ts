import { IntegrationNotConnectedError } from "./registry"

export interface OpenClayEnrichmentResult {
  field_name: string
  value: string
  confidence: string
  source: string
}

export async function enrichField(
  domain: string,
  prompt: string,
  apiKey?: string,
): Promise<OpenClayEnrichmentResult> {
  if (!apiKey) {
    throw new IntegrationNotConnectedError("openclay")
  }

  try {
    const response = await fetch("https://api.openclay.com/v1/enrich", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        domain,
        prompt,
      }),
    })

    if (response.status === 429) {
      throw new Error(
        "OpenClay rate limit exceeded. Please try again in a few moments.",
      )
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `OpenClay API error: ${response.status} - ${
          (errorData as any).error || response.statusText
        }`,
      )
    }

    const data = (await response.json()) as Record<string, any>

    return {
      field_name: data.field_name || "enriched_field",
      value: data.value || "",
      confidence: data.confidence || "low",
      source: data.source || "openclay",
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    throw new Error(`OpenClay enrichment failed: ${message}`)
  }
}
