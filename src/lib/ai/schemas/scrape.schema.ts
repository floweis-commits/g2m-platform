import { z } from "zod";

export const ScrapedCompanySchema = z.object({
  companyName: z.string().describe("Name of the company"),
  description: z.string().describe("Company description or tagline"),
  industry: z.string().describe("Primary industry"),
  employeeCount: z
    .string()
    .describe("Number of employees as string (e.g., '50-100')"),
  foundedYear: z.number().int().optional().nullable().describe("Year founded"),
  headquarters: z.string().describe("Headquarters location"),
  productDescription: z
    .string()
    .describe("Description of what the company builds"),
  targetCustomers: z.string().describe("Who the company sells to"),
  competitors: z.array(z.string()).describe("List of competitors"),
  uniqueValueProposition: z
    .string()
    .describe("Unique value proposition or key differentiator"),
});

export type ScrapedCompany = z.infer<typeof ScrapedCompanySchema>;
