import { z } from "zod";

export const ParsedQuerySchema = z.object({
  searchTerms: z
    .array(z.string())
    .describe("Key search terms extracted from the prompt"),
  filters: z
    .object({
      industries: z.array(z.string()).optional().describe("Target industries"),
      companySize: z
        .object({
          min: z.number().optional(),
          max: z.number().optional(),
        })
        .optional()
        .describe("Company employee count range"),
      fundingStage: z
        .array(z.string())
        .optional()
        .describe("Target funding stages (e.g., seed, series-a)"),
      geography: z
        .array(z.string())
        .optional()
        .describe("Geographic regions or countries"),
      keywords: z
        .array(z.string())
        .optional()
        .describe("Additional keywords for matching"),
    })
    .optional(),
  intent: z
    .string()
    .describe(
      "The user's intent (e.g., 'find tech startups', 'identify enterprise prospects')",
    ),
  estimatedResultCount: z
    .number()
    .int()
    .positive()
    .describe("Estimated number of results"),
});

export type ParsedQuery = z.infer<typeof ParsedQuerySchema>;
