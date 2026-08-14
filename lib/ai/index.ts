import type { AIProvider } from "./provider";
import { GeminiProvider } from "./gemini";

export type { AIProvider, ExtractionResult } from "./provider";

let instance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!instance) {
    instance = new GeminiProvider();
  }
  return instance;
}
