"use client";

import { AlertCircle, Loader2 } from "lucide-react";

interface EnrichmentCellProps {
  value: string | null;
  status: "pending" | "running" | "complete" | "error";
  errorMessage?: string;
}

export function EnrichmentCell({
  value,
  status,
  errorMessage,
}: EnrichmentCellProps) {
  switch (status) {
    case "pending":
      return <div className="h-5 rounded bg-slate-100" />;

    case "running":
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
          <span className="text-xs text-slate-500">Loading...</span>
        </div>
      );

    case "complete":
      return <span className="text-slate-900">{value}</span>;

    case "error":
      return (
        <div
          className="flex items-center gap-2 text-red-600"
          title={errorMessage || "Error"}
        >
          <AlertCircle className="h-4 w-4" />
          <span className="text-xs">Error</span>
        </div>
      );

    default:
      return <span className="text-slate-400">-</span>;
  }
}
