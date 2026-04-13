import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { inngest } from "@/lib/inngest/client"

const ExecuteSchema = z.object({
  sheet_row_ids: z.array(z.string().uuid()).min(1),
})

// POST /api/workflows/[workflowId]/execute
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  const { workflowId } = await params
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = ExecuteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Verify workflow belongs to this user
  const { data: workflow, error: wfError } = await supabase
    .from("workflows")
    .select("id, enabled")
    .eq("id", workflowId)
    .single()

  if (wfError || !workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
  }

  if (!workflow.enabled) {
    return NextResponse.json({ error: "Workflow is disabled" }, { status: 400 })
  }

  await inngest.send({
    name: "workflow/trigger",
    data: {
      workflow_id: workflowId,
      sheet_row_ids: parsed.data.sheet_row_ids,
      user_id: session.user.id,
    },
  })

  return NextResponse.json({ status: "queued", workflow_id: workflowId })
}
