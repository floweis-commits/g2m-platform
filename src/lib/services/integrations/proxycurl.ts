import { IntegrationNotConnectedError } from "./registry"

export interface ProxycurlCompanyData {
  employee_count: number | null
  follower_count: number | null
  founded_year: number | null
  hq_city: string | null
  hq_country: string | null
  company_type: string | null
  specialities: string[]
  website: string | null
  description: string | null
}

export async function enrichCompany(
  domain: string,
  apiKey?: string,
): Promise<ProxycurlCompanyData> {
  if (!apiKey) {
    throw new IntegrationNotConnectedError("proxycurl")
  }

  try {
    // Convert domain to LinkedIn URL if needed
    let linkedinUrl = domain
    if (!linkedinUrl.includes("linkedin.com")) {
      linkedinUrl = `https://linkedin.com/company/${domain}`
    }

    const response = await fetch(
      `https://nubela.co/proxycurl/api/linkedin/company?url=${encodeURIComponent(linkedinUrl)}&api_key=${apiKey}`,
      {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      },
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Proxycurl API error: ${response.status} - ${
          (errorData as any).error || response.statusText
        }`,
      )
    }

    const data = (await response.json()) as Record<string, any>

    return {
      employee_count: data.employee_count || null,
      follower_count: data.follower_count || null,
      founded_year: data.founded_year || null,
      hq_city: data.hq_city || null,
      hq_country: data.hq_country || null,
      company_type: data.company_type || null,
      specialities: data.specialities || [],
      website: data.website || null,
      description: data.description || null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    throw new Error(`Proxycurl enrichment failed: ${message}`)
  }
}
