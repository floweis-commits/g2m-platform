import { redirect } from "next/navigation";

import { ChatPanel } from "@/components/sheet/chat-panel";
import { DataTable } from "@/components/sheet/data-table";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const supabase = await createClient();
  const { projectId } = await params;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch project
  const { data: project } = await supabase
    .from("projects")
    .select()
    .eq("id", projectId)
    .eq("user_id", session.user.id)
    .single();

  if (!project) {
    redirect("/");
  }

  // Fetch latest sheet
  const { data: sheets } = await supabase
    .from("sheets")
    .select()
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1);

  const sheet = sheets?.[0];

  return (
    <div className="flex h-full gap-4 p-4">
      {/* Chat Panel */}
      <div className="w-1/3 border-r border-slate-200">
        <ChatPanel projectId={projectId} sheetId={sheet?.id} />
      </div>

      {/* Data Table */}
      <div className="flex-1">
        <DataTable projectId={projectId} sheetId={sheet?.id} />
      </div>
    </div>
  );
}
