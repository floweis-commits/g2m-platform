import { NextRequest, NextResponse } from "next/server"
import { inngest } from "@/lib/inngest/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyGmailSignature } from "@/lib/services/webhooks/signature-verification"

/**
 * POST /api/webhooks/gmail
 * Receives Gmail push notifications (via Google Pub/Sub).
 * Payload is base64-encoded JSON from Google.
 * Used for: email open tracking, reply detection.
 * Verifies that the message is from Google Pub/Sub.
 */
export async function POST(req: NextRequest) {
  const body = await req.json()

  // Google Pub/Sub wraps the message in { message: { data: base64, messageId, publishTime } }
  const message = body?.message

  // Verify the message is from Google Pub/Sub
  if (!verifyGmailSignature(message)) {
    console.warn("Invalid Gmail webhook message")
    return NextResponse.json({ error: "Invalid message" }, { status: 401 })
  }

  // Parse the base64-encoded message data
  let messageData: Record<string, unknown> = {}
  try {
    const raw = message?.data
    if (raw) {
      messageData = JSON.parse(Buffer.from(raw, "base64").toString("utf8"))
    }
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const emailAddress = String(messageData.emailAddress ?? "")
  const historyId = String(messageData.historyId ?? "")

  if (!emailAddress || !historyId) {
    return NextResponse.json({ error: "Missing emailAddress or historyId" }, { status: 400 })
  }

  // Look up user by connected Gmail account
  const supabase = createAdminClient()
  const { data: integration } = await supabase
    .from("user_integrations")
    .select("user_id, access_token")
    .eq("integration_id", "gmail")
    .eq("email_address", emailAddress)
    .single()

  if (!integration) {
    return NextResponse.json({ ok: true }) // not our user, ignore
  }

  // Fetch history from Gmail API to get changed message IDs
  const historyResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${historyId}&historyTypes=messageAdded`,
    {
      headers: { Authorization: `Bearer ${integration.access_token}` },
    },
  )

  if (!historyResponse.ok) {
    // Token may be expired — silently skip (token refresh is separate concern)
    return NextResponse.json({ ok: true })
  }

  const historyData = (await historyResponse.json()) as {
    history?: Array<{
      messages?: Array<{ id: string }>
      messagesAdded?: Array<{ message: { id: string; labelIds?: string[] } }>
    }>
  }

  // Fire engagement.track events for each relevant message
  for (const historyItem of historyData.history ?? []) {
    for (const added of historyItem.messagesAdded ?? []) {
      const msg = added.message
      const isInbox = msg.labelIds?.includes("INBOX")
      const action = isInbox ? "reply" : "open"

      await inngest.send({
        name: "engagement/track",
        data: {
          channel: "email",
          action,
          external_id: msg.id,
          timestamp: new Date().toISOString(),
          user_id: integration.user_id,
        },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
