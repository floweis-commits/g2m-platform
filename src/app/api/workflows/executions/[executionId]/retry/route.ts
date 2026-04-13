import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { inngest } from "@/lib/inngest/client"

type Params = Promise<{ executionId: string }>

// POST /api/workflows/executions/[executionId]/retry
export async function POST(_req: NextRequest, { params }: { params: Params }) {
  const { executionId } = await params
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: exec, error } = await supabase
    .from("workflow_executions")
    .select("*")
    .eq("id", executionId)
    .single()

  if (error || !exec) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (exec.status !== "failed") {
    return NextResponse.json({ error: "Only failed executions can be retried" }, { status: 400 })
  }

  // Reset to running and re-enqueue from current step
  await supabase
    .from("workflow_executions")
    .update({ status: "pending", updated_at: new Date().toISOString() })
    .eq("id", executionId)

  await inngest.send({
    name: "workflow/execute",
    data: { execution_id: executionId, user_id: session.user.id },
  })

  return NextResponse.json({ status: "requeued", execution_id: executionId })
}
