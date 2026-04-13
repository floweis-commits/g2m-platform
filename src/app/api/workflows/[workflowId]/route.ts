import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { CreateWorkflowSchema } from "@/lib/workflows/schemas"

type Params = Promise<{ workflowId: string }>

// GET /api/workflows/[workflowId]
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { workflowId } = await params
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", workflowId)
    .single()

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(data)
}

// PUT /api/workflows/[workflowId]
export async function PUT(req: NextRequest, { params }: { params: Params }) {
  const { workflowId } = await params
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = CreateWorkflowSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("workflows")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", workflowId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/workflows/[workflowId] — soft delete (disable)
export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { workflowId } = await params
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { error } = await supabase
    .from("workflows")
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("id", workflowId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
