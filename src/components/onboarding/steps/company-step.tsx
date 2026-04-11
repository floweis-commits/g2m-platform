"use client";

import { Check, Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CompanyStepProps {
  data: any;
  onDataChange: (data: any) => void;
}

export function CompanyStep({ data, onDataChange }: CompanyStepProps) {
  const [url, setUrl] = useState(data.website_url || "");
  const [isScraped, setIsScraped] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleScrape = async () => {
    if (!url) {
      toast.error("Please enter a website URL");
      return;
    }

    setIsScraping(true);
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error("Failed to scrape website");
      }

      const scrapedData = await response.json();
      onDataChange({
        website_url: url,
        company_name: scrapedData.companyName,
        company_description: scrapedData.description,
        industry: scrapedData.industry,
        employee_count: scrapedData.employeeCount,
        headquarters: scrapedData.headquarters,
        product_name: scrapedData.productDescription,
        competitors: scrapedData.competitors,
        unique_value_proposition: scrapedData.uniqueValueProposition,
      });

      setIsScraped(true);
      toast.success("Website data scraped successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to scrape website",
      );
    } finally {
      setIsScraping(false);
    }
  };

  const handleCopy = () => {
    const dataStr = JSON.stringify(
      {
        website_url: url,
        company_name: data.company_name,
        industry: data.industry,
      },
      null,
      2,
    );
    navigator.clipboard.writeText(dataStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-900">
          Company Website
        </label>
        <p className="mt-1 text-xs text-slate-500">
          We'll visit your website to extract company data
        </p>
        <div className="mt-2 flex gap-2">
          <Input
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isScraping}
            className="flex-1"
          />
          <Button
            onClick={handleScrape}
            disabled={isScraping}
            className="gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {isScraping ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scraping...
              </>
            ) : (
              "Fetch Data"
            )}
          </Button>
        </div>
      </div>

      {isScraped && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">
              Company Name
            </label>
            <p className="mt-1 text-sm text-slate-900">{data.company_name}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">
              Industry
            </label>
            <p className="mt-1 text-sm text-slate-900">{data.industry}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase">
              Description
            </label>
            <p className="mt-1 text-sm text-slate-900">
              {data.company_description}
            </p>
          </div>
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
            className="w-full gap-2"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy data
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
