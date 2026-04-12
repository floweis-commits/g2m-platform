"use client";

import { Badge } from "@/components/ui/badge";

interface ScoreColumnProps {
  score: number | null;
  priority: "high" | "medium" | "low" | null;
  reasoning: string | null;
}

export function ScoreColumn({
  score,
  priority,
  reasoning,
}: ScoreColumnProps) {
  if (score === null || priority === null) {
    return <span className="text-slate-400">-</span>;
  }

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "high":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "low":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div
      className="flex items-center gap-2"
      title={reasoning || undefined}
    >
      <Badge className={getPriorityColor(priority)} variant="secondary">
        {score}
      </Badge>
    </div>
  );
}
