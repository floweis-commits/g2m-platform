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

    const { integrationId, apiKey, accessToken } = await request.json();

    if (!integrationId) {
      return NextResponse.json(
        { error: "integrationId is required" },
        { status: 400 },
      );
    }

    // Check if integration already exists
    const { data: existing } = await supabase
      .from("user_integrations")
      .select()
      .eq("user_id", session.user.id)
      .eq("integration_id", integrationId)
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from("user_integrations")
        .update({
          api_key: apiKey,
          access_token: accessToken,
        })
        .eq("id", existing.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    } else {
      // Create new
      const { error } = await supabase.from("user_integrations").insert({
        user_id: session.user.id,
        integration_id: integrationId,
        auth_type: apiKey ? "api-key" : "oauth",
        api_key: apiKey,
        access_token: accessToken,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error connecting integration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
