"use client";

import { Loader2, Send } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ChatPanelProps {
  projectId: string;
  sheetId?: string;
}

export function ChatPanel({ projectId, sheetId }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    try {
      // Handle follow-up conversation here
      console.log("Sending:", input);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
      setInput("");
    }
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      <Card className="flex-1 border-slate-200 p-4">
        <div className="h-full space-y-3">
          {sheetId ? (
            <>
              <div className="text-xs text-slate-500">
                <strong>Sheet:</strong> {sheetId.slice(0, 8)}...
              </div>
              <p className="text-sm text-slate-700">
                Ready for follow-up questions about these leads
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Create a search to start analyzing leads
            </p>
          )}
        </div>
      </Card>

      {sheetId && (
        <div className="flex gap-2">
          <Input
            placeholder="Ask a follow-up question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
