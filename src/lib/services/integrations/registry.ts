export type IntegrationCategory =
  | "data-source"
  | "enrichment"
  | "crm"
  | "outreach";
export type AuthType = "api-key" | "oauth";
export type IntegrationStatus = "connected" | "not-connected" | "error";

export interface Integration {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  authType: AuthType;
  envKey?: string;
  oauthPath?: string;
  logoUrl: string;
  docsUrl: string;
}

const INTEGRATIONS_REGISTRY: Record<string, Integration> = {
  crunchbase: {
    id: "crunchbase",
    name: "Crunchbase",
    description: "Company and funding data",
    category: "data-source",
    authType: "api-key",
    envKey: "CRUNCHBASE_API_KEY",
    logoUrl: "/integrations/crunchbase.svg",
    docsUrl: "https://docs.crunchbase.com/",
  },
  coresignal: {
    id: "coresignal",
    name: "CoreSignal",
    description: "Workforce and hiring signals",
    category: "data-source",
    authType: "api-key",
    envKey: "CORESIGNAL_API_KEY",
    logoUrl: "/integrations/coresignal.svg",
    docsUrl: "https://www.coresignal.com/",
  },
  proxycurl: {
    id: "proxycurl",
    name: "Proxycurl",
    description: "LinkedIn profile scraping",
    category: "enrichment",
    authType: "api-key",
    envKey: "PROXYCURL_API_KEY",
    logoUrl: "/integrations/proxycurl.svg",
    docsUrl: "https://proxycurl.com/",
  },
  openclay: {
    id: "openclay",
    name: "OpenClay",
    description: "Person and company enrichment",
    category: "enrichment",
    authType: "api-key",
    envKey: "OPENCLAY_API_KEY",
    logoUrl: "/integrations/openclay.svg",
    docsUrl: "https://openclay.com/",
  },
  firecrawl: {
    id: "firecrawl",
    name: "Firecrawl",
    description: "Web scraping and LLM extraction",
    category: "data-source",
    authType: "api-key",
    envKey: "FIRECRAWL_API_KEY",
    logoUrl: "/integrations/firecrawl.svg",
    docsUrl: "https://www.firecrawl.dev/",
  },
  hubspot: {
    id: "hubspot",
    name: "HubSpot",
    description: "CRM platform",
    category: "crm",
    authType: "oauth",
    oauthPath: "/api/integrations/oauth/hubspot",
    logoUrl: "/integrations/hubspot.svg",
    docsUrl: "https://developers.hubspot.com/",
  },
  salesforce: {
    id: "salesforce",
    name: "Salesforce",
    description: "Enterprise CRM",
    category: "crm",
    authType: "oauth",
    oauthPath: "/api/integrations/oauth/salesforce",
    logoUrl: "/integrations/salesforce.svg",
    docsUrl: "https://developer.salesforce.com/",
  },
  pipedrive: {
    id: "pipedrive",
    name: "Pipedrive",
    description: "Sales pipeline management",
    category: "crm",
    authType: "oauth",
    oauthPath: "/api/integrations/oauth/pipedrive",
    logoUrl: "/integrations/pipedrive.svg",
    docsUrl: "https://developers.pipedrive.com/",
  },
  attio: {
    id: "attio",
    name: "Attio",
    description: "Modern CRM",
    category: "crm",
    authType: "oauth",
    oauthPath: "/api/integrations/oauth/attio",
    logoUrl: "/integrations/attio.svg",
    docsUrl: "https://www.attio.com/",
  },
  gmail: {
    id: "gmail",
    name: "Gmail",
    description: "Email outreach",
    category: "outreach",
    authType: "oauth",
    oauthPath: "/api/integrations/oauth/gmail",
    logoUrl: "/integrations/gmail.svg",
    docsUrl: "https://developers.google.com/gmail",
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    description: "Professional network outreach",
    category: "outreach",
    authType: "oauth",
    oauthPath: "/api/integrations/oauth/linkedin",
    logoUrl: "/integrations/linkedin.svg",
    docsUrl: "https://www.linkedin.com/developers/",
  },
};

export function getIntegration(id: string): Integration | null {
  return INTEGRATIONS_REGISTRY[id] ?? null;
}

export function getIntegrationsByCategory(
  category: IntegrationCategory,
): Integration[] {
  return Object.values(INTEGRATIONS_REGISTRY).filter(
    (integration) => integration.category === category,
  );
}

export function getAllIntegrations(): Integration[] {
  return Object.values(INTEGRATIONS_REGISTRY);
}

export function isConnected(
  integrationId: string,
  userIntegrations: Array<{ integration_id: string }>,
): boolean {
  return userIntegrations.some((ui) => ui.integration_id === integrationId);
}

export class IntegrationNotConnectedError extends Error {
  constructor(integrationId: string) {
    super(
      `Integration ${integrationId} is not connected. Please connect it in settings.`,
    );
    this.name = "IntegrationNotConnectedError";
  }
}
