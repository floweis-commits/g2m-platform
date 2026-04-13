import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getIntegration } from "@/lib/services/integrations/registry"
import crypto from "crypto"

type Params = Promise<{ connectorId: string }>

// OAuth provider configs — connector-agnostic, driven by registry
const OAUTH_CONFIGS: Record<string, {
  authUrl: string
  clientIdEnv: string
  scope: string
}> = {
  gmail: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    scope: "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly",
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    scope: "r_liteprofile r_emailaddress w_member_social",
  },
  hubspot: {
    authUrl: "https://app.hubspot.com/oauth/authorize",
    clientIdEnv: "HUBSPOT_CLIENT_ID",
    scope: "crm.objects.contacts.write crm.objects.contacts.read engagements",
  },
  salesforce: {
    authUrl: "https://login.salesforce.com/services/oauth2/authorize",
    clientIdEnv: "SALESFORCE_CLIENT_ID",
    scope: "api refresh_token",
  },
  pipedrive: {
    authUrl: "https://oauth.pipedrive.com/oauth/authorize",
    clientIdEnv: "PIPEDRIVE_CLIENT_ID",
    scope: "deals:write contacts:write activities:write",
  },
  attio: {
    authUrl: "https://app.attio.com/oauth/authorize",
    clientIdEnv: "ATTIO_CLIENT_ID",
    scope: "record_permission:read record_permission:write",
  },
}

// POST /api/integrations/[connectorId]/oauth/authorize
export async function POST(
  _req: NextRequest,
  { params }: { params: Params },
) {
  const { connectorId } = await params
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const integration = getIntegration(connectorId)
  if (!integration) {
    return NextResponse.json({ error: "Unknown connector" }, { status: 404 })
  }

  const config = OAUTH_CONFIGS[connectorId]
  if (!config) {
    return NextResponse.json({ error: "OAuth not supported for this connector" }, { status: 400 })
  }

  const clientId = process.env[config.clientIdEnv]
  if (!clientId) {
    return NextResponse.json({ error: `${config.clientIdEnv} not configured` }, { status: 500 })
  }

  // Generate PKCE state token — store in DB so callback can verify
  const stateToken = crypto.randomBytes(32).toString("hex")
  await supabase.from("oauth_states").insert({
    user_id: session.user.id,
    connector_id: connectorId,
    state_token: stateToken,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
  })

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/${connectorId}/oauth/callback`

  const authUrl = new URL(config.authUrl)
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", config.scope)
  authUrl.searchParams.set("state", stateToken)
  authUrl.searchParams.set("access_type", "offline") // get refresh token

  return NextResponse.json({ auth_url: authUrl.toString(), state_token: stateToken })
}
