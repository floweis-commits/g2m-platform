import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/workflows/[workflowId]/executions
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  const { workflowId } = await params
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const sheetRowId = searchParams.get("sheet_row_id")
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100)
  const offset = Number(searchParams.get("offset") ?? 0)

  let query = supabase
    .from("workflow_executions")
    .select("*", { count: "exact" })
    .eq("workflow_id", workflowId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq("status", status)
  if (sheetRowId) query = query.eq("sheet_row_id", sheetRowId)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, total: count, limit, offset })
}
