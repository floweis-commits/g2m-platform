import { NextRequest, NextResponse } from "next/server";

import { ParsedQuerySchema } from "@/lib/ai/schemas/query.schema";
import { callLLM } from "@/lib/services/api-service";
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

    const { prompt, projectId } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    // Fetch project ICP for context
    const { data: project } = await supabase
      .from("projects")
      .select()
      .eq("id", projectId)
      .eq("user_id", session.user.id)
      .single();

    const icpContext = project?.icp_description || "Not specified";

    // Call LLM to parse query
    const systemPrompt = `You are an expert B2B lead sourcing assistant. Parse the user's natural language query into structured search parameters.

User's ICP: ${icpContext}

Return a structured query with search terms, filters, intent, and estimated result count.`;

    const parsedQuery = await callLLM(
      "nlpQueryParser",
      `${systemPrompt}\n\nUser Query: ${prompt}`,
      ParsedQuerySchema,
    );

    return NextResponse.json(parsedQuery);
  } catch (error) {
    console.error("Error parsing query:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
