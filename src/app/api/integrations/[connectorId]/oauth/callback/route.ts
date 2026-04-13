import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getIntegration } from "@/lib/services/integrations/registry"

type Params = Promise<{ connectorId: string }>

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

// GET /api/integrations/[connectorId]/oauth/callback
// Called by the OAuth provider redirect
export async function GET(
  req: NextRequest,
  { params }: { params: Params },
) {
  const { connectorId } = await params
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)

  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const errorParam = searchParams.get("error")

  if (errorParam) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=${encodeURIComponent(errorParam)}`,
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=missing_params`,
    )
  }

  // Verify state token
  const { data: oauthState, error: stateError } = await supabase
    .from("oauth_states")
    .select("*")
    .eq("state_token", state)
    .eq("connector_id", connectorId)
    .gt("expires_at", new Date().toISOString())
    .single()

  if (stateError || !oauthState) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=invalid_state`,
    )
  }

  const config = TOKEN_ENDPOINTS[connectorId]
  if (!config) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=unsupported_connector`,
    )
  }

  const clientId = process.env[config.clientIdEnv]
  const clientSecret = process.env[config.clientSecretEnv]
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=oauth_not_configured`,
    )
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/${connectorId}/oauth/callback`

  // Exchange code for tokens
  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text()
    console.error("Token exchange failed:", err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=token_exchange_failed`,
    )
  }

  const tokens = (await tokenResponse.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
  }

  // Upsert into user_integrations (connector-agnostic)
  await supabase.from("user_integrations").upsert(
    {
      user_id: oauthState.user_id,
      integration_id: connectorId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,integration_id" },
  )

  // Clean up state token
  await supabase.from("oauth_states").delete().eq("id", oauthState.id)

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/settings?connected=${connectorId}`,
  )
}
