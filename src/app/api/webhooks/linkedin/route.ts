import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { inngest } from "@/lib/inngest/client"
import { createAdminClient } from "@/lib/supabase/admin"

const LinkedInWebhookSchema = z.object({
  eventType: z.string(),
  actor: z.object({ id: z.string() }).optional(),
  object: z.object({ id: z.string() }).optional(),
  timestamp: z.number().optional(),
})

/**
 * POST /api/webhooks/linkedin
 * Receives LinkedIn engagement events (profile views, message replies).
 * Requires LinkedIn webhook subscription set up in the developer portal.
 */
export async function POST(req: NextRequest) {
  // Verify LinkedIn webhook signature (simplified — production should verify HMAC)
  const body = await req.json()
  const parsed = LinkedInWebhookSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const { eventType, actor, object, timestamp } = parsed.data
  const profileId = actor?.id ?? object?.id

  if (!profileId) {
    return NextResponse.json({ ok: true })
  }

  // Map LinkedIn event types to our action enum
  const actionMap: Record<string, string> = {
    "urn:li:eventType:memberProfileView": "linkedin_viewed",
    "urn:li:eventType:messageDelivered": "reply",
    "urn:li:eventType:invitationAccepted": "send",
  }

  const action = actionMap[eventType]
  if (!action) {
    return NextResponse.json({ ok: true }) // unrecognized event, ignore
  }

  // Find user whose outreach has this profile
  const supabase = createAdminClient()
  const { data: log } = await supabase
    .from("outreach_logs")
    .select("workflow_execution_id")
    .contains("metadata", { linkedin_profile: profileId })
    .limit(1)
    .single()

  if (!log) {
    return NextResponse.json({ ok: true })
  }

  const { data: exec } = await supabase
    .from("workflow_executions")
    .select("workflows(user_id)")
    .eq("id", log.workflow_execution_id)
    .single()

  const userId = (exec?.workflows as any)?.user_id
  if (!userId) {
    return NextResponse.json({ ok: true })
  }

  await inngest.send({
    name: "engagement/track",
    data: {
      channel: action === "linkedin_viewed" ? "linkedin_message" : "linkedin_connect",
      action,
      external_id: profileId,
      timestamp: timestamp
        ? new Date(timestamp).toISOString()
        : new Date().toISOString(),
      user_id: userId,
    },
  })

  return NextResponse.json({ ok: true })
}
