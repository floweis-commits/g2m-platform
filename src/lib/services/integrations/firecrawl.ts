import { z } from "zod";

import { ScrapedCompanySchema } from "@/lib/ai/schemas/scrape.schema";

import { IntegrationNotConnectedError } from "./registry";

export async function scrapeCompanyWebsite(
  url: string,
  apiKey?: string,
): Promise<z.infer<typeof ScrapedCompanySchema>> {
  if (!apiKey) {
    // Fallback to basic fetch + parsing
    console.log(
      "[INFO] Firecrawl API key not provided, using fallback scraper",
    );
    return scrapeWithFallback(url);
  }

  try {
    // Stub Firecrawl implementation
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
  // Basic fallback scraper
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

    // Extract title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1] : "Company";

    // Extract meta description
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
