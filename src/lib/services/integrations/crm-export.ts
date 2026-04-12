import { z } from "zod"

import { getIntegration } from "./registry"
import * as hubspot from "./hubspot"

export interface FieldMapping {
  [key: string]: string
}

export interface CRMSchema {
  fields: Array<{
    name: string
    label: string
    type: string
    required: boolean
  }>
}

export interface ExportResult {
  total: number
  exported: number
  failed: number
  errors: Array<{
    leadId: string
    error: string
  }>
}

interface Lead {
  id: string
  company_name?: string
  domain?: string
  description?: string
  industry?: string
  employee_count?: string
  funding_stage?: string
  funding_amount?: number
  score?: number
}

export async function fetchCrmSchema(
  crmId: string,
  accessToken?: string,
): Promise<CRMSchema> {
  const integration = getIntegration(crmId)

  if (!integration) {
    throw new Error(`CRM integration not found: ${crmId}`)
  }

  switch (crmId) {
    case "hubspot":
      return await hubspot.getSchema(accessToken)
    case "salesforce":
      // Stub for future implementation
      return {
        fields: [
          {
            name: "company_name",
            label: "Company Name",
            type: "text",
            required: true,
          },
        ],
      }
    case "pipedrive":
      // Stub for future implementation
      return {
        fields: [
          {
            name: "company_name",
            label: "Company Name",
            type: "text",
            required: true,
          },
        ],
      }
    default:
      throw new Error(`CRM export not implemented for: ${crmId}`)
  }
}

export async function exportLeads(
  crmId: string,
  leads: Lead[],
  fieldMapping: FieldMapping,
  accessToken?: string,
): Promise<ExportResult> {
  const integration = getIntegration(crmId)

  if (!integration) {
    throw new Error(`CRM integration not found: ${crmId}`)
  }

  switch (crmId) {
    case "hubspot": {
      const result = await hubspot.exportLeads(leads, fieldMapping, accessToken)
      return {
        total: leads.length,
        exported: result.leadsCreated,
        failed: result.errors.length,
        errors: result.errors.map((e) => ({
          leadId: e.leadId,
          error: e.error,
        })),
      }
    }
    case "salesforce":
      // Stub for future implementation
      return {
        total: leads.length,
        exported: 0,
        failed: leads.length,
        errors: leads.map((lead) => ({
          leadId: lead.id,
          error: "Salesforce export not yet implemented",
        })),
      }
    case "pipedrive":
      // Stub for future implementation
      return {
        total: leads.length,
        exported: 0,
        failed: leads.length,
        errors: leads.map((lead) => ({
          leadId: lead.id,
          error: "Pipedrive export not yet implemented",
        })),
      }
    default:
      throw new Error(`CRM export not implemented for: ${crmId}`)
  }
}

export function validateFieldMapping(
  mapping: FieldMapping,
  schema: CRMSchema,
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const requiredFields = schema.fields.filter((f) => f.required)

  for (const requiredField of requiredFields) {
    const isMapped = Object.values(mapping).includes(requiredField.name)
    if (!isMapped) {
      errors.push(`Required field not mapped: ${requiredField.label}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
