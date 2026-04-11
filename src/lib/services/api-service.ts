import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

import { env } from "@/env.mjs";

export interface LLMCallOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export async function callLLM<T extends z.ZodType<any, any, any>>(
  task: string,
  prompt: string,
  schema: T,
  options?: LLMCallOptions,
): Promise<any> {
  try {
    const result = await generateObject({
      model: anthropic("claude-3-5-sonnet-20241022"),
      prompt,
      schema: schema as any,
      temperature: options?.temperature ?? 0.7,
    });

    return result.object as z.infer<T>;
  } catch (error) {
    console.error(`LLM call failed for task ${task}:`, error);
    throw new Error(
      `Failed to process ${task}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function trackCostEvent(
  userId: string,
  provider: string,
  operation: string,
  inputTokens: number = 0,
  outputTokens: number = 0,
  sheetId?: string,
): Promise<void> {
  // Stub for now - cost tracking will be implemented later
  console.log(
    `[COST] User: ${userId}, Provider: ${provider}, Operation: ${operation}, Tokens: ${inputTokens}/${outputTokens}`,
  );
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
