import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RecentSheets } from "@/components/dashboard/recent-sheets";
import { SearchBar } from "@/components/dashboard/search-bar";
import { SuggestedPrompts } from "@/components/dashboard/suggested-prompts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch active project
  const { data: projects } = await supabase
    .from("projects")
    .select()
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const activeProject = projects?.[0];

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-4xl font-bold">
            Let's find your next customer
          </h1>
          <p className="mt-2 text-slate-600">
            Powered by AI and integrated data sources
          </p>
        </div>
        {!activeProject && (
          <Link href="/onboarding">
            <Button className="gap-2 bg-purple-600 hover:bg-purple-700">
              New Project
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      {/* Search Bar */}
      <div className="mx-auto w-full max-w-2xl">
        <SearchBar projectId={activeProject?.id} />
      </div>

      {/* Suggested Prompts */}
      {activeProject && (
        <div>
          <h2 className="text-foreground mb-4 text-lg font-semibold">
            Suggested searches for your ICP
          </h2>
          <SuggestedPrompts projectId={activeProject.id} />
        </div>
      )}

      {/* Recent Sheets */}
      {activeProject && (
        <div>
          <h2 className="text-foreground mb-4 text-lg font-semibold">
            Recent searches
          </h2>
          <RecentSheets projectId={activeProject.id} />
        </div>
      )}

      {/* CTA if no project */}
      {!activeProject && (
        <Card className="border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <h2 className="text-foreground text-xl font-semibold">
            Get started with your first search
          </h2>
          <p className="mt-2 text-slate-600">
            Create a project to start sourcing leads. We'll help you scrape your
            website and build your ideal customer profile.
          </p>
          <Link href="/onboarding" className="mt-6 inline-block">
            <Button className="gap-2 bg-purple-600 hover:bg-purple-700">
              Create Project
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
