import { NextRequest, NextResponse } from "next/server";

import { env } from "@/env.mjs";
import { scrapeCompanyWebsite } from "@/lib/services/integrations/firecrawl";
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

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const scrapedData = await scrapeCompanyWebsite(url, env.FIRECRAWL_API_KEY);

    return NextResponse.json(scrapedData);
  } catch (error) {
    console.error("Error scraping website:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
