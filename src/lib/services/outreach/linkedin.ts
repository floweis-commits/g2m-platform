/**
 * LinkedIn outreach handler — connector-agnostic
 * Routes to LinkedIn extension API or official OAuth connector
 * Rate limits: 50 messages/day, 20 connection requests/day per account
 */

import type { ActionConfigSchema } from "@/lib/workflows/schemas"
import type { z } from "zod"
import { refreshUserIntegrationToken } from "@/lib/services/integrations/token-refresh"

export interface LinkedInResult {
  success: boolean
  external_id?: string // LinkedIn profile URN or message ID
  error?: string
  rate_limited?: boolean
  retry_after_ms?: number
}

type ActionConfig = z.infer<typeof ActionConfigSchema>

function interpolate(template: string, leadData: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    String(leadData[key] ?? `{{${key}}}`),
  )
}

/**
 * Send a LinkedIn message to a lead.
 * profileId comes from leadData.linkedin_url or leadData.linkedin_profile_id.
 * userId and integrationId are used for token refresh on 401.
 */
export async function sendLinkedInMessage({
  config,
  leadData,
  accessToken,
  userId,
  integrationId = "linkedin",
}: {
  config: ActionConfig
  leadData: Record<string, unknown>
  accessToken: string
  userId?: string
  integrationId?: string
}): Promise<LinkedInResult> {
  const profileId = extractProfileId(leadData)
  if (!profileId) {
    return { success: false, error: "No LinkedIn profile found in lead data" }
  }

  const body = interpolate(config.body, leadData)

  try {
    let currentToken = accessToken

    // LinkedIn messaging API — send a message to a connection
    const response = await fetch("https://api.linkedin.com/v2/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${currentToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        recipients: [{ person: { id: profileId } }],
        subject: config.subject ?? "",
        body,
        messageType: "MEMBER_TO_MEMBER",
      }),
    })

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? 86400) * 1000
      return {
        success: false,
        rate_limited: true,
        retry_after_ms: retryAfter,
        error: "LinkedIn daily message limit reached",
      }
    }

    // Handle 401 with token refresh
    if (response.status === 401 && userId && integrationId) {
      const refreshResult = await refreshUserIntegrationToken(userId, integrationId)
      if (refreshResult.success && refreshResult.access_token) {
        currentToken = refreshResult.access_token

        // Retry with new token
        const retryResponse = await fetch("https://api.linkedin.com/v2/messages", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
          },
          body: JSON.stringify({
            recipients: [{ person: { id: profileId } }],
            subject: config.subject ?? "",
            body,
            messageType: "MEMBER_TO_MEMBER",
          }),
        })

        if (retryResponse.status === 429) {
          const retryAfter = Number(retryResponse.headers.get("Retry-After") ?? 86400) * 1000
          return {
            success: false,
            rate_limited: true,
            retry_after_ms: retryAfter,
            error: "LinkedIn daily message limit reached",
          }
        }

        if (!retryResponse.ok) {
          const error = await retryResponse.text()
          return { success: false, error: `LinkedIn API error after token refresh: ${error}` }
        }

        const location = retryResponse.headers.get("X-RestLi-Id") ?? profileId
        return { success: true, external_id: location }
      } else {
        return { success: false, error: `Token refresh failed: ${refreshResult.error}` }
      }
    }

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error: `LinkedIn API error: ${error}` }
    }

    const location = response.headers.get("X-RestLi-Id") ?? profileId
    return { success: true, external_id: location }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

/**
 * Send a LinkedIn connection request to a lead.
 * userId and integrationId are used for token refresh on 401.
 */
export async function sendLinkedInConnect({
  config,
  leadData,
  accessToken,
  userId,
  integrationId = "linkedin",
}: {
  config: ActionConfig
  leadData: Record<string, unknown>
  accessToken: string
  userId?: string
  integrationId?: string
}): Promise<LinkedInResult> {
  const profileId = extractProfileId(leadData)
  if (!profileId) {
    return { success: false, error: "No LinkedIn profile found in lead data" }
  }

  const note = config.body ? interpolate(config.body, leadData) : undefined

  try {
    let currentToken = accessToken

    const body: Record<string, unknown> = {
      invitee: {
        "com.linkedin.voyager.growth.invitation.InviteeProfile": {
          profileId,
        },
      },
      trackingId: `g2m_${Date.now()}`,
    }

    if (note) {
      body.message = note
    }

    const response = await fetch(
      "https://api.linkedin.com/v2/invitations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(body),
      },
    )

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? 86400) * 1000
      return {
        success: false,
        rate_limited: true,
        retry_after_ms: retryAfter,
        error: "LinkedIn daily connection request limit reached",
      }
    }

    // 409 = already connected
    if (response.status === 409) {
      return {
        success: true,
        external_id: profileId,
        error: "Already connected — logged as completed",
      }
    }

    // Handle 401 with token refresh
    if (response.status === 401 && userId && integrationId) {
      const refreshResult = await refreshUserIntegrationToken(userId, integrationId)
      if (refreshResult.success && refreshResult.access_token) {
        currentToken = refreshResult.access_token

        // Retry with new token
        const retryResponse = await fetch(
          "https://api.linkedin.com/v2/invitations",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${currentToken}`,
              "Content-Type": "application/json",
              "X-Restli-Protocol-Version": "2.0.0",
            },
            body: JSON.stringify(body),
          },
        )

        if (retryResponse.status === 429) {
          const retryAfter = Number(retryResponse.headers.get("Retry-After") ?? 86400) * 1000
          return {
            success: false,
            rate_limited: true,
            retry_after_ms: retryAfter,
            error: "LinkedIn daily connection request limit reached",
          }
        }

        if (retryResponse.status === 409) {
          return {
            success: true,
            external_id: profileId,
            error: "Already connected — logged as completed",
          }
        }

        if (!retryResponse.ok) {
          const error = await retryResponse.text()
          return { success: false, error: `LinkedIn API error after token refresh: ${error}` }
        }

        return { success: true, external_id: profileId }
      } else {
        return { success: false, error: `Token refresh failed: ${refreshResult.error}` }
      }
    }

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error: `LinkedIn API error: ${error}` }
    }

    return { success: true, external_id: profileId }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

function extractProfileId(leadData: Record<string, unknown>): string | null {
  // Support multiple lead field names
  const url =
    (leadData.linkedin_url as string) ??
    (leadData.linkedin_profile as string) ??
    (leadData.linkedin as string)

  if (!url) return null

  // Extract the ID slug from a full LinkedIn URL, or return as-is if it's already an ID
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i)
  return match ? match[1] : url
}
