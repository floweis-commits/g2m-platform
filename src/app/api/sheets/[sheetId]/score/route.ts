import { NextRequest, NextResponse } from "next/server"

import { inngest } from "@/lib/inngest/client"
import { createClient } from "@/lib/supabase/server"

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

    // Fetch sheet
    const { data: sheet, error: sheetError } = await supabase
      .from("sheets")
      .select("id, project_id")
      .eq("id", sheetId)
      .eq("user_id", session.user.id)
      .single()

    if (sheetError || !sheet) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 404 })
    }

    // Fetch project to get ICP description
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("icp_description")
      .eq("id", sheet.project_id)
      .eq("user_id", session.user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      )
    }

    // Update sheet status to running
    const { error: updateError } = await supabase
      .from("sheets")
      .update({
        status: "running",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sheetId)
      .eq("user_id", session.user.id)

    if (updateError) {
      console.error("Error updating sheet status:", updateError)
      return NextResponse.json(
        { error: "Failed to update sheet status" },
        { status: 500 },
      )
    }

    // Send Inngest event
    await inngest.send({
      name: "scoring/batch",
      data: {
        sheetId,
        userId: session.user.id,
        projectIcp: project.icp_description || "",
      },
    })

    return NextResponse.json({
      message: "Scoring started",
      sheetId,
    })
  } catch (error) {
    console.error("Error triggering scoring:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
