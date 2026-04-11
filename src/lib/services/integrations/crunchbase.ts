import { IntegrationNotConnectedError } from "./registry";

export interface CrunchbaseCompany {
  name: string;
  description: string;
  website: string;
  founded_year: number | null;
  employee_count: string;
  funding_total_usd: number | null;
  funding_stage: string;
  headquarters_city: string;
  headquarters_country: string;
  industries: string[];
  revenue_usd: number | null;
}

export interface SearchCompaniesParams {
  name?: string;
  industry?: string[];
  locations?: string[];
  employee_count_min?: number;
  employee_count_max?: number;
  funding_stage?: string[];
}

export async function searchCompanies(
  params: SearchCompaniesParams,
  apiKey?: string,
): Promise<CrunchbaseCompany[]> {
  if (!apiKey) {
    throw new IntegrationNotConnectedError("crunchbase");
  }

  // Stub implementation
  console.log("[STUB] Crunchbase search with params:", params);
  return [];
}

export async function getCompanyDetails(
  domain: string,
  apiKey?: string,
): Promise<CrunchbaseCompany | null> {
  if (!apiKey) {
    throw new IntegrationNotConnectedError("crunchbase");
  }

  // Stub implementation
  console.log("[STUB] Crunchbase company details for:", domain);
  return null;
}
