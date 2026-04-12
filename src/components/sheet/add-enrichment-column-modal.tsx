"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AddEnrichmentColumnModalProps {
  sheetId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TOOL_OPTIONS = [
  { value: "auto", label: "Auto-detect" },
  { value: "proxycurl", label: "Proxycurl" },
  { value: "openclay", label: "OpenClay" },
  { value: "coresignal", label: "Coresignal" },
  { value: "websearch", label: "Web search" },
];

export function AddEnrichmentColumnModal({
  sheetId,
  isOpen,
  onClose,
  onSuccess,
}: AddEnrichmentColumnModalProps) {
  const [columnName, setColumnName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [toolHint, setToolHint] = useState("auto");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!columnName.trim()) {
      setError("Column name is required");
      return;
    }

    if (!prompt.trim()) {
      setError("Prompt/Description is required");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/sheets/${sheetId}/enrich`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          columnName,
          prompt,
          toolHint,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add enrichment column");
      }

      // Reset form
      setColumnName("");
      setPrompt("");
      setToolHint("auto");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Enrichment Column</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody>
            <div className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="columnName">Column Name</Label>
                <Input
                  id="columnName"
                  placeholder="e.g., Job Openings"
                  value={columnName}
                  onChange={(e) => setColumnName(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt / Description</Label>
                <Textarea
                  id="prompt"
                  placeholder="e.g., Find the number of open job postings for this company"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="toolHint">Tool Hint (Optional)</Label>
                <select
                  id="toolHint"
                  value={toolHint}
                  onChange={(e) => setToolHint(e.target.value)}
                  disabled={isLoading}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-500 dark:focus-visible:ring-slate-300"
                >
                  {TOOL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Column
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
