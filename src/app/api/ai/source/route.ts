import { NextRequest, NextResponse } from "next/server";

import { searchCompanies } from "@/lib/services/integrations/crunchbase";
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

    const { query, projectId, sheetId } = await request.json();

    // Create a sheet if one doesn't exist
    let currentSheetId = sheetId;
    if (!currentSheetId) {
      const { data: newSheet, error: sheetError } = await supabase
        .from("sheets")
        .insert({
          project_id: projectId,
          user_id: session.user.id,
          name: `Search: ${query.intent}`,
          prompt: JSON.stringify(query),
          status: "running",
        })
        .select()
        .single();

      if (sheetError || !newSheet) {
        return NextResponse.json(
          { error: "Failed to create sheet" },
          { status: 400 },
        );
      }

      currentSheetId = newSheet.id;
    }

    // Fetch user's connected integrations
    const { data: userIntegrations } = await supabase
      .from("user_integrations")
      .select()
      .eq("user_id", session.user.id);

    const crunchbaseIntegration = userIntegrations?.find(
      (ui) => ui.integration_id === "crunchbase",
    );

    // Call Crunchbase if connected
    let leads: any[] = [];
    if (crunchbaseIntegration?.api_key) {
      try {
        const results = await searchCompanies(
          {
            name: query.searchTerms.join(" "),
            industry: query.filters?.industries,
            locations: query.filters?.geography,
            employee_count_min: query.filters?.companySize?.min,
            employee_count_max: query.filters?.companySize?.max,
            funding_stage: query.filters?.fundingStage,
          },
          crunchbaseIntegration.api_key,
        );

        leads = results;
      } catch (err) {
        console.error("Crunchbase search error:", err);
      }
    } else {
      // Return stub results if no integration
      leads = [
        {
          name: "Example Company",
          website: "example.com",
          industry: "SaaS",
          employee_count: "50-100",
        },
      ];
    }

    // Save leads to database
    if (leads.length > 0) {
      const leadsToInsert = leads.map((lead: any) => ({
        sheet_id: currentSheetId,
        user_id: session.user.id,
        company_name: lead.name,
        domain: lead.website,
        industry: lead.industry,
        employee_count: lead.employee_count,
        raw_data: lead,
      }));

      await supabase.from("leads").insert(leadsToInsert);
    }

    // Update sheet status
    await supabase
      .from("sheets")
      .update({ status: "completed" })
      .eq("id", currentSheetId);

    return NextResponse.json({
      sheetId: currentSheetId,
      leads,
      count: leads.length,
    });
  } catch (error) {
    console.error("Error sourcing leads:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
