/**
 * Email outreach handler — connector-agnostic
 * Routes to whichever email provider is connected (Gmail, etc.)
 * Rate limits and credentials fetched from integration registry + user_integrations
 */

import type { ActionConfigSchema } from "@/lib/workflows/schemas"
import type { z } from "zod"

export interface EmailSendResult {
  success: boolean
  external_id?: string // Gmail message_id or provider equivalent
  error?: string
}

type ActionConfig = z.infer<typeof ActionConfigSchema>

// Interpolate {{variable}} placeholders with lead data
function interpolate(template: string, leadData: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    String(leadData[key] ?? `{{${key}}}`),
  )
}

/**
 * Send email via the connected email provider.
 * accessToken comes from user_integrations table (fetched by caller).
 */
export async function sendEmail({
  config,
  leadData,
  accessToken,
  provider = "gmail",
}: {
  config: ActionConfig
  leadData: Record<string, unknown>
  accessToken: string
  provider?: string
}): Promise<EmailSendResult> {
  const subject = interpolate(config.subject ?? "", leadData)
  const body = interpolate(config.body, leadData)
  const recipientEmail = String(
    leadData.email ?? leadData.contact_email ?? "",
  )

  if (!recipientEmail) {
    return { success: false, error: "No recipient email found in lead data" }
  }

  switch (provider) {
    case "gmail":
      return sendViaGmail({ accessToken, to: recipientEmail, subject, body })
    default:
      return { success: false, error: `Email provider not supported: ${provider}` }
  }
}

async function sendViaGmail({
  accessToken,
  to,
  subject,
  body,
}: {
  accessToken: string
  to: string
  subject: string
  body: string
}): Promise<EmailSendResult> {
  try {
    // Compose RFC 2822 message
    const messageParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/html; charset=utf-8",
      "",
      body,
    ]
    const raw = Buffer.from(messageParts.join("\n"))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")

    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      },
    )

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error: `Gmail API error: ${error}` }
    }

    const data = (await response.json()) as { id: string }
    return { success: true, external_id: data.id }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}
