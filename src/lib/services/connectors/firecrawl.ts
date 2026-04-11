import { z } from "zod";

import { ScrapedCompanySchema } from "@/lib/ai/schemas/scrape.schema";
import { IntegrationNotConnectedError } from "@/lib/services/integrations/registry";

export async function scrapeCompanyWebsite(
  url: string,
  apiKey?: string,
): Promise<z.infer<typeof ScrapedCompanySchema>> {
  if (!apiKey) {
    console.log(
      "[INFO] Firecrawl API key not provided, using fallback scraper",
    );
    return scrapeWithFallback(url);
  }

  try {
    console.log("[STUB] Firecrawl scraping URL:", url);
    return scrapeWithFallback(url);
  } catch (error) {
    console.error("Firecrawl scrape failed, falling back:", error);
    return scrapeWithFallback(url);
  }
}

async function scrapeWithFallback(
  url: string,
): Promise<z.infer<typeof ScrapedCompanySchema>> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const html = await response.text();

    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1] : "Company";

    const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
    const description = descMatch ? descMatch[1] : "No description available";

    return {
      companyName: title,
      description: description,
      industry: "Unknown",
      employeeCount: "Unknown",
      foundedYear: null,
      headquarters: "Unknown",
      productDescription: description,
      targetCustomers: "Unknown",
      competitors: [],
      uniqueValueProposition: description,
    };
  } catch (error) {
    console.error("Fallback scraper error:", error);
    throw new Error(
      `Failed to scrape website: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
