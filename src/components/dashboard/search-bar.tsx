"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SearchBarProps {
  projectId?: string;
}

export function SearchBar({ projectId }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sourceType, setSourceType] = useState("cold");
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (!projectId) {
      toast.error("Please create a project first");
      router.push("/onboarding");
      return;
    }

    setIsLoading(true);

    try {
      // First parse the query with LLM
      const parseResponse = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query, projectId }),
      });

      if (!parseResponse.ok) {
        throw new Error("Failed to parse query");
      }

      const parsedQuery = await parseResponse.json();

      // Then source leads
      const sourceResponse = await fetch("/api/ai/source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: parsedQuery,
          projectId,
          sourceType,
        }),
      });

      if (!sourceResponse.ok) {
        throw new Error("Failed to source leads");
      }

      const result = await sourceResponse.json();

      toast.success(`Found ${result.count} leads`);
      if (result.sheetId) {
        router.push(`/projects/${projectId}?sheet=${result.sheetId}`);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error(error instanceof Error ? error.message : "Search failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tabs defaultValue={sourceType} onValueChange={setSourceType}>
      <TabsList className="grid w-full grid-cols-2 bg-slate-100">
        <TabsTrigger value="cold">Cold Search</TabsTrigger>
        <TabsTrigger value="warm">Warm Search</TabsTrigger>
      </TabsList>

      <TabsContent value="cold" className="mt-6 space-y-3">
        <p className="text-sm text-slate-600">
          Find new companies from our data sources based on your criteria
        </p>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Find SaaS startups in fintech with 10-50 employees..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={isLoading}
            className="gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {isLoading ? "Searching..." : "Search"}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="warm" className="mt-6 space-y-3">
        <p className="text-sm text-slate-600">
          Enrich existing contacts and companies from your database
        </p>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Upload CSV or paste company names..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={isLoading}
            className="gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {isLoading ? "Processing..." : "Enrich"}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
