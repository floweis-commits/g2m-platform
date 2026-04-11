"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface Sheet {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

interface RecentSheetsProps {
  projectId: string;
}

export function RecentSheets({ projectId }: RecentSheetsProps) {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSheets = async () => {
      try {
        const response = await fetch(
          `/api/projects?filter=sheets&projectId=${projectId}`,
        );
        if (response.ok) {
          const data = await response.json();
          setSheets(data || []);
        }
      } catch (error) {
        console.error("Error fetching sheets:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSheets();
  }, [projectId]);

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading...</div>;
  }

  if (sheets.length === 0) {
    return (
      <div className="text-sm text-slate-500">
        No searches yet. Create one above.
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {sheets.map((sheet) => (
        <Link key={sheet.id} href={`/projects/${projectId}?sheet=${sheet.id}`}>
          <Card className="min-w-64 cursor-pointer border-slate-200 p-4 transition hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{sheet.name}</h3>
                <p className="text-xs text-slate-500">
                  {new Date(sheet.created_at).toLocaleDateString()}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-3">
              <Badge
                variant={sheet.status === "completed" ? "default" : "secondary"}
                className="text-xs"
              >
                {sheet.status}
              </Badge>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
