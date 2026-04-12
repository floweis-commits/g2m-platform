import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { inngest } from "@/lib/inngest/client"
import { createClient } from "@/lib/supabase/server"

const ExportRequestSchema = z.object({
  crmIntegrationId: z.string().min(1),
  fieldMapping: z.record(z.string(), z.string()),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sheetId: string }> },
) {
  try {
    const { sheetId } = await params
    const supabase = await createClient()

    // Auth check
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Validate request body
    const body = await request.json()
    const validation = ExportRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.format() },
        { status: 400 },
      )
    }

    const { crmIntegrationId, fieldMapping } = validation.data

    // Verify sheet exists
    const { data: sheet, error: sheetError } = await supabase
      .from("sheets")
      .select("id")
      .eq("id", sheetId)
      .eq("user_id", session.user.id)
      .single()

    if (sheetError || !sheet) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 404 })
    }

    // Verify user has the CRM integration connected
    const { data: integration, error: integrationError } = await supabase
      .from("user_integrations")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("integration_id", crmIntegrationId)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: `CRM integration not connected: ${crmIntegrationId}` },
        { status: 400 },
      )
    }

    // Send Inngest event
    await inngest.send({
      name: "export/crm-sync",
      data: {
        sheetId,
        crmIntegrationId,
        fieldMapping,
        userId: session.user.id,
      },
    })

    return NextResponse.json({
      message: "Export started",
      sheetId,
    })
  } catch (error) {
    console.error("Error triggering export:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
