"use client";

import { Key, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Integration } from "@/lib/services/integrations/registry";

interface IntegrationCardProps {
  integration: Integration;
  isConnected: boolean;
  onConnect?: (apiKey?: string) => Promise<void>;
  onDisconnect?: () => Promise<void>;
}

export function IntegrationCard({
  integration,
  isConnected,
  onConnect,
  onDisconnect,
}: IntegrationCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isShowingForm, setIsShowingForm] = useState(false);

  const handleConnect = async () => {
    if (integration.authType === "api-key") {
      if (!apiKey.trim()) {
        toast.error("Please enter an API key");
        return;
      }
      setIsLoading(true);
      try {
        await onConnect?.(apiKey);
        setApiKey("");
        setIsShowingForm(false);
        toast.success(`${integration.name} connected`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to connect",
        );
      } finally {
        setIsLoading(false);
      }
    } else {
      // OAuth flow
      window.location.href = integration.oauthPath || "#";
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await onDisconnect?.();
      toast.success(`${integration.name} disconnected`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to disconnect",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-slate-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">{integration.name}</h3>
          <p className="mt-1 text-xs text-slate-600">
            {integration.description}
          </p>
          <div className="mt-2 flex gap-2">
            <Badge variant="outline" className="text-xs">
              {integration.category}
            </Badge>
            {isConnected && (
              <Badge className="bg-green-100 text-xs text-green-700">
                Connected
              </Badge>
            )}
          </div>
        </div>

        {isConnected ? (
          <Button
            onClick={handleDisconnect}
            disabled={isLoading}
            variant="destructive"
            size="sm"
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
            Disconnect
          </Button>
        ) : (
          <Button
            onClick={() => setIsShowingForm(!isShowingForm)}
            size="sm"
            className="gap-2 bg-purple-600 hover:bg-purple-700"
          >
            <Key className="h-3 w-3" />
            Connect
          </Button>
        )}
      </div>

      {isShowingForm && integration.authType === "api-key" && (
        <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
          <Input
            type="password"
            placeholder={`Enter ${integration.name} API key`}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={isLoading}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleConnect}
              disabled={isLoading}
              size="sm"
              className="gap-2"
            >
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Save Key
            </Button>
            <Button
              onClick={() => setIsShowingForm(false)}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
