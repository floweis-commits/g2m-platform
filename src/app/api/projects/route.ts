import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: session.user.id,
        name: body.company_name || "My Project",
        website_url: body.website_url,
        company_name: body.company_name,
        company_description: body.company_description,
        industry: body.industry,
        employee_count: body.employee_count,
        headquarters: body.headquarters,
        product_name: body.product_name,
        product_description: body.product_description,
        target_customers: body.target_customers,
        icp_description: body.icp_description,
        competitors: body.competitors || [],
        unique_value_proposition: body.unique_value_proposition,
        writing_style: body.writing_style,
        dos: body.dos || [],
        donts: body.donts || [],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("projects")
      .select()
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
