"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface ExportCrmModalProps {
  sheetId: string;
  isOpen: boolean;
  onClose: () => void;
  connectedCrms: Array<{ id: string; name: string }>;
}

const DEFAULT_SHEET_COLUMNS = [
  "Company Name",
  "Domain",
  "Industry",
  "Employee Count",
  "Funding Stage",
  "Score",
];

interface FieldMapping {
  [sheetColumn: string]: string;
}

export function ExportCrmModal({
  sheetId,
  isOpen,
  onClose,
  connectedCrms,
}: ExportCrmModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCrmId, setSelectedCrmId] = useState<string>("");
  const [crmSchema, setCrmSchema] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Initialize field mapping when we get the schema
  useEffect(() => {
    if (crmSchema.length > 0) {
      const initialMapping: FieldMapping = {};
      DEFAULT_SHEET_COLUMNS.forEach((col) => {
        initialMapping[col] = crmSchema[0] || "";
      });
      setFieldMapping(initialMapping);
    }
  }, [crmSchema]);

  const handleCrmSelect = async (crmId: string) => {
    setSelectedCrmId(crmId);
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/sheets/${sheetId}/export/schema?crm=${crmId}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch CRM schema");
      }

      const data = await response.json();
      setCrmSchema(data.fields || []);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldMappingChange = (
    sheetColumn: string,
    crmField: string,
  ) => {
    setFieldMapping((prev) => ({
      ...prev,
      [sheetColumn]: crmField,
    }));
  };

  const handleExport = async () => {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`/api/sheets/${sheetId}/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          crmIntegrationId: selectedCrmId,
          fieldMapping,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to export leads");
      }

      setSuccessMessage("Successfully exported leads to CRM");
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedCrmId("");
    setCrmSchema([]);
    setFieldMapping({});
    setError("");
    setSuccessMessage("");
    onClose();
  };

  const selectedCrmName = connectedCrms.find(
    (c) => c.id === selectedCrmId,
  )?.name;

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {step === 1
              ? "Export Leads to CRM"
              : step === 2
                ? "Map Fields"
                : "Confirm Export"}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          {successMessage && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Select which CRM to export your leads to:
              </p>
              {connectedCrms.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No connected CRMs available. Please connect a CRM first.
                </p>
              ) : (
                <div className="space-y-2">
                  {connectedCrms.map((crm) => (
                    <label
                      key={crm.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                    >
                      <input
                        type="radio"
                        name="crm"
                        value={crm.id}
                        checked={selectedCrmId === crm.id}
                        onChange={(e) => handleCrmSelect(e.target.value)}
                        disabled={isLoading}
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-medium text-slate-900">
                        {crm.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Map your sheet columns to {selectedCrmName} fields:
              </p>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {DEFAULT_SHEET_COLUMNS.map((column) => (
                  <div key={column} className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label className="text-xs text-slate-600">
                        {column}
                      </Label>
                    </div>
                    <select
                      value={fieldMapping[column] || ""}
                      onChange={(e) =>
                        handleFieldMappingChange(column, e.target.value)
                      }
                      disabled={isLoading}
                      className="flex h-8 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"
                    >
                      <option value="">Select field...</option>
                      {crmSchema.map((field) => (
                        <option key={field} value={field}>
                          {field}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                className="w-full"
                onClick={() => setStep(3)}
                disabled={isLoading || Object.values(fieldMapping).some((v) => !v)}
              >
                Continue
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">
                  Ready to export to {selectedCrmName}
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  Your leads will be exported with the following field mappings:
                </p>
                <ul className="mt-3 space-y-1 text-xs text-slate-600">
                  {DEFAULT_SHEET_COLUMNS.map((col) => (
                    <li key={col}>
                      {col} → {fieldMapping[col]}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s) => ((s - 1) as 1 | 2 | 3))}
              disabled={isLoading}
            >
              Back
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handleExport} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Export Leads
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
