import { IntegrationNotConnectedError } from "./registry";

export interface CRMSchema {
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
  }>;
}

export interface FieldMapping {
  [key: string]: string; // Maps lead field to CRM field
}

export interface ExportResult {
  success: boolean;
  leadsCreated: number;
  errors: Array<{
    leadId: string;
    error: string;
  }>;
}

export async function getSchema(accessToken?: string): Promise<CRMSchema> {
  if (!accessToken) {
    throw new IntegrationNotConnectedError("hubspot");
  }

  // Stub implementation
  console.log("[STUB] HubSpot getSchema");
  return {
    fields: [
      {
        name: "company_name",
        label: "Company Name",
        type: "text",
        required: true,
      },
      { name: "contact_email", label: "Email", type: "email", required: false },
      { name: "industry", label: "Industry", type: "text", required: false },
      {
        name: "employee_count",
        label: "Employees",
        type: "number",
        required: false,
      },
    ],
  };
}

export async function exportLeads(
  leads: Array<any>,
  fieldMapping: FieldMapping,
  accessToken?: string,
): Promise<ExportResult> {
  if (!accessToken) {
    throw new IntegrationNotConnectedError("hubspot");
  }

  // Stub implementation
  console.log(
    "[STUB] HubSpot export",
    leads.length,
    "leads with mapping:",
    fieldMapping,
  );
  return {
    success: true,
    leadsCreated: leads.length,
    errors: [],
  };
}
