// Server-side allowlist of AI models
// Maps internal model IDs to user-facing labels
export const ALLOWED_MODELS = {
  "gemini-2.5-flash-latest": "Sürətli",
  "gemini-2.5-pro": "Dəqiq (Pro)",
  "gemini-2.5-flash": "Standart",
  "gemini-1.5-flash": "Klassik Sürətli",
  "gemini-1.5-pro": "Klassik Dəqiq",
} as const;

export type AllowedModelId = keyof typeof ALLOWED_MODELS;

export function isAllowedModel(model: string): model is AllowedModelId {
  return model in ALLOWED_MODELS;
}

export function validateModel(model: string): AllowedModelId {
  if (!isAllowedModel(model)) {
    throw new Error("Seçilmiş model dəstəklənmir");
  }
  return model;
}
