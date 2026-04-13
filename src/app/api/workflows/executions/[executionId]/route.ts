import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type Params = Promise<{ executionId: string }>

// GET /api/workflows/executions/[executionId]
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { executionId } = await params
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("workflow_executions")
    .select("*, workflows(name, steps, trigger)")
    .eq("id", executionId)
    .single()

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(data)
}
