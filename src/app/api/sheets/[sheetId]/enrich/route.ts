import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { inngest } from "@/lib/inngest/client"
import { createClient } from "@/lib/supabase/server"

const EnrichRequestSchema = z.object({
  columnName: z.string().min(1),
  prompt: z.string().min(1),
  toolHint: z.string().optional(),
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
    const validation = EnrichRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.format() },
        { status: 400 },
      )
    }

    const { columnName, prompt, toolHint } = validation.data

    // Fetch sheet
    const { data: sheet, error: sheetError } = await supabase
      .from("sheets")
      .select("id, column_config")
      .eq("id", sheetId)
      .eq("user_id", session.user.id)
      .single()

    if (sheetError || !sheet) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 404 })
    }

    // Add column to sheet's column_config if not already present
    const columnConfig = sheet.column_config || []
    const columnExists = columnConfig.some((c: any) => c.name === columnName)

    if (!columnExists) {
      const newColumnConfig = [
        ...columnConfig,
        {
          name: columnName,
          prompt,
          toolHint: toolHint || null,
        },
      ]

      const { error: updateError } = await supabase
        .from("sheets")
        .update({
          column_config: newColumnConfig,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sheetId)
        .eq("user_id", session.user.id)

      if (updateError) {
        console.error("Error updating sheet config:", updateError)
        return NextResponse.json(
          { error: "Failed to update sheet configuration" },
          { status: 500 },
        )
      }
    }

    // Send Inngest event
    await inngest.send({
      name: "enrichment/run-column",
      data: {
        sheetId,
        columnConfig: {
          name: columnName,
          prompt,
          toolHint: toolHint || undefined,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json({
      message: "Enrichment started",
      columnName,
    })
  } catch (error) {
    console.error("Error triggering enrichment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
