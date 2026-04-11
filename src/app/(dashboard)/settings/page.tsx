import { redirect } from "next/navigation";

import { IntegrationsPanel } from "@/components/settings/integrations-panel";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch user integrations
  const { data: userIntegrations } = await supabase
    .from("user_integrations")
    .select()
    .eq("user_id", session.user.id);

  const user = session.user;

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-foreground text-3xl font-bold">Settings</h1>
        <p className="mt-2 text-slate-600">
          Manage your account and integrations
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-foreground text-lg font-semibold">
              Account Information
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <p className="mt-1 rounded bg-slate-50 px-3 py-2 text-slate-900">
                  {user.email}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  User ID
                </label>
                <p className="mt-1 rounded bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900">
                  {user.id}
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <IntegrationsPanel userIntegrations={userIntegrations || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
