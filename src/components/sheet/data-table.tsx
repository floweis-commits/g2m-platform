"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface Lead {
  id: string;
  company_name: string;
  domain: string;
  industry: string;
  employee_count: string;
  status: string;
}

interface DataTableProps {
  projectId: string;
  sheetId?: string;
}

export function DataTable({ projectId, sheetId }: DataTableProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      if (!sheetId) {
        setIsLoading(false);
        return;
      }

      try {
        // This would fetch leads from the API
        console.log("Fetching leads for sheet:", sheetId);
        setLeads([]);
      } catch (error) {
        console.error("Error fetching leads:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeads();
  }, [sheetId]);

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

  return (
    <div className="space-y-4">
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
    </div>
  );
}
