import type { AIProvider } from "./provider";

export type { AIProvider, ExtractionResult } from "./provider";

let instance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!instance) {
    // Lazy load to avoid cold start overhead
    const { GeminiProvider } = require("./gemini");
    instance = new GeminiProvider();
  }
  return instance!;
}
