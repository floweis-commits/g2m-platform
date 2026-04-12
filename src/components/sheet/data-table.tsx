"use client";

import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { AddEnrichmentColumnModal } from "@/components/sheet/add-enrichment-column-modal";
import { EnrichmentCell } from "@/components/sheet/enrichment-cell";
import { ExportCrmModal } from "@/components/sheet/export-crm-modal";
import { ScoreColumn } from "@/components/sheet/score-column";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Lead {
  id: string;
  company_name: string;
  domain: string;
  industry: string;
  employee_count: string;
  status: string;
  score?: number | null;
  priority?: "high" | "medium" | "low" | null;
  score_reasoning?: string | null;
  [key: string]: unknown;
}

interface Sheet {
  id: string;
  status: string;
  column_config?: {
    [key: string]: {
      prompt: string;
      status: "pending" | "running" | "complete" | "error";
      error_message?: string;
    };
  };
}

interface DataTableProps {
  projectId: string;
  sheetId?: string;
}

export function DataTable({ projectId, sheetId }: DataTableProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScoring, setIsScoring] = useState(false);
  const [isEnrichmentModalOpen, setIsEnrichmentModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!sheetId) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch sheet metadata
        const sheetResponse = await fetch(`/api/sheets/${sheetId}`);
        if (sheetResponse.ok) {
          const sheetData = await sheetResponse.json();
          setSheet(sheetData);
        }

        // Fetch leads from the API
        console.log("Fetching leads for sheet:", sheetId);
        setLeads([]);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [sheetId]);

  const handleScoreLeads = async () => {
    if (!sheetId) return;

    setIsScoring(true);
    try {
      const response = await fetch(`/api/sheets/${sheetId}/score`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to score leads");
      }

      // Refresh leads after scoring
      setLeads([]);
    } catch (error) {
      console.error("Error scoring leads:", error);
    } finally {
      setIsScoring(false);
    }
  };

  const handleEnrichmentSuccess = () => {
    // Refresh sheet data to get updated column_config
    if (sheetId) {
      fetch(`/api/sheets/${sheetId}`)
        .then((res) => res.json())
        .then((data) => setSheet(data))
        .catch((err) => console.error("Error refreshing sheet:", err));
    }
  };

  if (!sheetId) {
    return (
      <Card className="flex items-center justify-center border-dashed border-slate-300 bg-slate-50 p-12">
        <p className="text-sm text-slate-600">
          Create a search to view leads here
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center p-12">
        <p className="text-sm text-slate-600">Loading leads...</p>
      </Card>
    );
  }

  if (leads.length === 0) {
    return (
      <Card className="flex items-center justify-center border-dashed border-slate-300 bg-slate-50 p-12">
        <p className="text-sm text-slate-600">No leads found</p>
      </Card>
    );
  }

  const enrichmentColumns = Object.keys(sheet?.column_config || {});
  const hasScores = leads.length > 0 && leads[0]?.score !== undefined;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {sheet?.status === "running" && (
          <Badge className="gap-1 bg-blue-100 text-blue-800">
            <Loader2 className="h-3 w-3 animate-spin" />
            Running...
          </Badge>
        )}
        {sheet?.status === "completed" && (
          <Badge className="bg-green-100 text-green-800">Complete</Badge>
        )}

        <div className="ml-auto flex gap-2">
          <Button
            onClick={handleScoreLeads}
            disabled={isScoring || !sheetId}
            className="gap-2"
            size="sm"
          >
            {isScoring && <Loader2 className="h-4 w-4 animate-spin" />}
            ⚡ Score Leads
          </Button>

          <Button
            onClick={() => setIsEnrichmentModalOpen(true)}
            disabled={!sheetId}
            className="gap-2"
            size="sm"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            Add Enrichment
          </Button>

          <Button
            onClick={() => setIsExportModalOpen(true)}
            disabled={!sheetId}
            size="sm"
            variant="outline"
          >
            Export ▼
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">
                Company
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">
                Domain
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">
                Industry
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">
                Employees
              </th>
              {hasScores && (
                <th className="px-4 py-3 text-left font-semibold text-slate-900">
                  Score
                </th>
              )}
              {enrichmentColumns.map((column) => (
                <th
                  key={column}
                  className="px-4 py-3 text-left font-semibold text-slate-900"
                >
                  {column}
                </th>
              ))}
              <th className="px-4 py-3 text-left font-semibold text-slate-900">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="px-4 py-3 text-slate-900">
                  {lead.company_name}
                </td>
                <td className="px-4 py-3 text-slate-600">{lead.domain}</td>
                <td className="px-4 py-3 text-slate-600">{lead.industry}</td>
                <td className="px-4 py-3 text-slate-600">
                  {lead.employee_count}
                </td>
                {hasScores && (
                  <td className="px-4 py-3">
                    <ScoreColumn
                      score={lead.score || null}
                      priority={lead.priority || null}
                      reasoning={lead.score_reasoning || null}
                    />
                  </td>
                )}
                {enrichmentColumns.map((column) => (
                  <td key={column} className="px-4 py-3">
                    <EnrichmentCell
                      value={
                        typeof lead[column] === "string"
                          ? (lead[column] as string)
                          : null
                      }
                      status={
                        (sheet?.column_config?.[column]?.status as
                          | "pending"
                          | "running"
                          | "complete"
                          | "error") || "pending"
                      }
                      errorMessage={
                        sheet?.column_config?.[column]?.error_message
                      }
                    />
                  </td>
                ))}
                <td className="px-4 py-3">
                  <Badge variant="secondary" className="text-xs">
                    {lead.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <AddEnrichmentColumnModal
        sheetId={sheetId || ""}
        isOpen={isEnrichmentModalOpen}
        onClose={() => setIsEnrichmentModalOpen(false)}
        onSuccess={handleEnrichmentSuccess}
      />

      <ExportCrmModal
        sheetId={sheetId || ""}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        connectedCrms={[]}
      />
    </div>
  );
}
