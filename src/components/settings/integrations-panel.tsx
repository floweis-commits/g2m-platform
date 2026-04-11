"use client";

import {
  getAllIntegrations,
  getIntegrationsByCategory,
  type IntegrationCategory,
  isConnected as checkIsConnected,
} from "@/lib/services/integrations/registry";

import { IntegrationCard } from "./integration-card";

interface IntegrationsPanelProps {
  userIntegrations: Array<{ integration_id: string }>;
}

const CATEGORIES: { id: IntegrationCategory; label: string }[] = [
  { id: "data-source", label: "Data Sources" },
  { id: "enrichment", label: "Enrichment" },
  { id: "crm", label: "CRM" },
  { id: "outreach", label: "Outreach" },
];

export function IntegrationsPanel({
  userIntegrations,
}: IntegrationsPanelProps) {
  const handleConnect = async (integrationId: string, apiKey?: string) => {
    const response = await fetch("/api/integrations/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ integrationId, apiKey }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to connect integration");
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    const response = await fetch("/api/integrations/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ integrationId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to disconnect integration");
    }
  };

  return (
    <div className="space-y-8">
      {CATEGORIES.map((category) => {
        const integrations = getIntegrationsByCategory(category.id);

        return (
          <div key={category.id}>
            <h3 className="text-foreground mb-4 text-lg font-semibold">
              {category.label}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {integrations.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  isConnected={checkIsConnected(
                    integration.id,
                    userIntegrations,
                  )}
                  onConnect={(apiKey) => handleConnect(integration.id, apiKey)}
                  onDisconnect={() => handleDisconnect(integration.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
