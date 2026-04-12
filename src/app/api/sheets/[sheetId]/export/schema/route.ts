import { NextRequest, NextResponse } from "next/server"

import { fetchCrmSchema } from "@/lib/services/integrations/crm-export"
import { createClient } from "@/lib/supabase/server"

export async function GET(
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

    // Get CRM from query params
    const crm = request.nextUrl.searchParams.get("crm")

    if (!crm) {
      return NextResponse.json(
        { error: "CRM parameter required" },
        { status: 400 },
      )
    }

    // Verify user has the CRM integration connected
    const { data: integration, error: integrationError } = await supabase
      .from("user_integrations")
      .select("access_token, api_key")
      .eq("user_id", session.user.id)
      .eq("integration_id", crm)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: `CRM integration not connected: ${crm}` },
        { status: 400 },
      )
    }

    // Fetch CRM schema
    const accessToken = integration.access_token || integration.api_key

    const schema = await fetchCrmSchema(crm, accessToken)

    return NextResponse.json(schema)
  } catch (error) {
    console.error("Error fetching CRM schema:", error)
    const message =
      error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
