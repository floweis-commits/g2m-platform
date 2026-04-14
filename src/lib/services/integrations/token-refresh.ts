/**
 * OAuth Token Refresh Utility
 * Handles on-demand token refresh for OAuth integrations when 401 is encountered
 */

import { createAdminClient } from "@/lib/supabase/admin"

const TOKEN_ENDPOINTS: Record<string, {
  tokenUrl: string
  clientIdEnv: string
  clientSecretEnv: string
}> = {
  gmail: {
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
  },
  linkedin: {
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    clientSecretEnv: "LINKEDIN_CLIENT_SECRET",
  },
  hubspot: {
    tokenUrl: "https://api.hubapi.com/oauth/v1/token",
    clientIdEnv: "HUBSPOT_CLIENT_ID",
    clientSecretEnv: "HUBSPOT_CLIENT_SECRET",
  },
  salesforce: {
    tokenUrl: "https://login.salesforce.com/services/oauth2/token",
    clientIdEnv: "SALESFORCE_CLIENT_ID",
    clientSecretEnv: "SALESFORCE_CLIENT_SECRET",
  },
  pipedrive: {
    tokenUrl: "https://oauth.pipedrive.com/oauth/token",
    clientIdEnv: "PIPEDRIVE_CLIENT_ID",
    clientSecretEnv: "PIPEDRIVE_CLIENT_SECRET",
  },
  attio: {
    tokenUrl: "https://app.attio.com/oauth/token",
    clientIdEnv: "ATTIO_CLIENT_ID",
    clientSecretEnv: "ATTIO_CLIENT_SECRET",
  },
}

export interface RefreshTokenResult {
  success: boolean
  access_token?: string
  error?: string
}

/**
 * Refresh an OAuth token for a user integration.
 * Called when an API returns 401 Unauthorized.
 */
export async function refreshUserIntegrationToken(
  userId: string,
  integrationId: string,
): Promise<RefreshTokenResult> {
  const supabase = createAdminClient()

  // Fetch user's integration record
  const { data: integration, error } = await supabase
    .from("user_integrations")
    .select("refresh_token, access_token")
    .eq("user_id", userId)
    .eq("integration_id", integrationId)
    .single()

  if (error || !integration) {
    return { success: false, error: "Integration not found" }
  }

  if (!integration.refresh_token) {
    return { success: false, error: "No refresh token available" }
  }

  const config = TOKEN_ENDPOINTS[integrationId]
  if (!config) {
    return { success: false, error: `Token refresh not configured for ${integrationId}` }
  }

  const clientId = process.env[config.clientIdEnv]
  const clientSecret = process.env[config.clientSecretEnv]

  if (!clientId || !clientSecret) {
    return { success: false, error: "OAuth credentials not configured" }
  }

  try {
    // Exchange refresh token for new access token
    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: integration.refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error(`Token refresh failed for ${integrationId}:`, error)
      return { success: false, error: "Token refresh failed" }
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string
      refresh_token?: string
      expires_in?: number
    }

    // Update database with new token
    await supabase
      .from("user_integrations")
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? integration.refresh_token,
        token_expires_at: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("integration_id", integrationId)

    return { success: true, access_token: tokens.access_token }
  } catch (err) {
    console.error("Token refresh error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}
