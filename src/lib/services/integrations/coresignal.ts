import { IntegrationNotConnectedError } from "./registry"

export interface CoresignalCompanyData {
  name: string
  website: string
  employees_count: number | null
  industry: string
  founded: number | null
  description: string | null
  hq_country: string | null
  growth_yoy_pct: number | null
  linkedin_followers: number | null
  job_openings_count: number | null
}

export interface CoresignalSearchFilters {
  industry?: string
  location?: string
  employee_count_min?: number
  employee_count_max?: number
}

export async function searchCompanies(
  query: string,
  filters: CoresignalSearchFilters = {},
  apiKey?: string,
): Promise<CoresignalCompanyData[]> {
  if (!apiKey) {
    throw new IntegrationNotConnectedError("coresignal")
  }

  try {
    // Build query params from filters
    const params = new URLSearchParams({
      q: query,
    })

    if (filters.industry) {
      params.append("industry", filters.industry)
    }
    if (filters.location) {
      params.append("location", filters.location)
    }
    if (filters.employee_count_min) {
      params.append("employee_count_min", filters.employee_count_min.toString())
    }
    if (filters.employee_count_max) {
      params.append("employee_count_max", filters.employee_count_max.toString())
    }

    const response = await fetch(
      `https://api.coresignal.com/cdapi/v1/search?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json",
        },
      },
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Coresignal API error: ${response.status} - ${
          (errorData as any).error || response.statusText
        }`,
      )
    }

    const data = (await response.json()) as Record<string, any>

    // Map Coresignal API response to our interface
    return (data.results || []).map((company: Record<string, any>) => ({
      name: company.name || "",
      website: company.website || "",
      employees_count: company.employees_count || null,
      industry: company.industry || "",
      founded: company.founded || null,
      description: company.description || null,
      hq_country: company.hq_country || null,
      growth_yoy_pct: company.growth_yoy_pct || null,
      linkedin_followers: company.linkedin_followers || null,
      job_openings_count: company.job_openings_count || null,
    }))
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    throw new Error(`Coresignal search failed: ${message}`)
  }
}

export async function getCompanyDetails(
  companyId: string,
  apiKey?: string,
): Promise<CoresignalCompanyData> {
  if (!apiKey) {
    throw new IntegrationNotConnectedError("coresignal")
  }

  try {
    // Note: Coresignal endpoint may vary - this is a stub pending API verification
    const response = await fetch(
      `https://api.coresignal.com/cdapi/v1/company/${companyId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json",
        },
      },
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Coresignal API error: ${response.status} - ${
          (errorData as any).error || response.statusText
        }`,
      )
    }

    const data = (await response.json()) as Record<string, any>

    return {
      name: data.name || "",
      website: data.website || "",
      employees_count: data.employees_count || null,
      industry: data.industry || "",
      founded: data.founded || null,
      description: data.description || null,
      hq_country: data.hq_country || null,
      growth_yoy_pct: data.growth_yoy_pct || null,
      linkedin_followers: data.linkedin_followers || null,
      job_openings_count: data.job_openings_count || null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    throw new Error(`Coresignal fetch failed: ${message}`)
  }
}
