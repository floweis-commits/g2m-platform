export type ModelTask =
  | "nlpQueryParser"
  | "agentOrchestration"
  | "bulkScoring"
  | "enrichmentCells";

const MODEL_CONFIG: Record<ModelTask, string> = {
  nlpQueryParser: "claude-sonnet-4-6",
  agentOrchestration: "claude-sonnet-4-6",
  bulkScoring: "claude-3-5-sonnet-20241022", // Using more recent model ID
  enrichmentCells: "claude-3-5-sonnet-20241022",
};

export function getModel(task: ModelTask): string {
  const model = MODEL_CONFIG[task];
  if (!model) {
    throw new Error(`Unknown model task: ${task}`);
  }
  return model;
}

export const ALL_MODELS = Object.values(MODEL_CONFIG);
