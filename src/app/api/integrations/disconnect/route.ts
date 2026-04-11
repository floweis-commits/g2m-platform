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

    const { integrationId } = await request.json();

    if (!integrationId) {
      return NextResponse.json(
        { error: "integrationId is required" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("user_integrations")
      .delete()
      .eq("user_id", session.user.id)
      .eq("integration_id", integrationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting integration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
