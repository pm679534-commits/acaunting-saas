import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import type { AIProvider, ExtractionResult } from "./provider";

const EXTRACTION_PROMPT = `You are a document data extraction assistant for Azerbaijani accounting firms.
Analyze the provided invoice or receipt image/PDF and extract the following fields.
Return ONLY a valid JSON object with no markdown, no code blocks, no extra text.

Required JSON schema:
{
  "date": "YYYY-MM-DD string or null if not found",
  "amount": number or null (total amount as a number, no currency symbols),
  "currency": "AZN|USD|EUR|TRY|RUB or null",
  "vendor_name": "company/person name string or null",
  "tax_id": "VÖEN (taxpayer ID) 10-digit string or null",
  "category": "one of: Mal/Xidmət, Yanacaq, Nəqliyyat, Kommunal, Əmək haqqı, Digər or null",
  "confidence": number between 0 and 1 representing overall extraction confidence
}`;

const STRICT_EXTRACTION_PROMPT = `${EXTRACTION_PROMPT}

CRITICAL: Return ONLY the JSON object. No explanation. No markdown. No \`\`\`. Just the raw JSON.`;

function parseExtractionJson(text: string): ExtractionResult {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const parsed = JSON.parse(cleaned);

  return {
    date: typeof parsed.date === "string" ? parsed.date : null,
    amount: typeof parsed.amount === "number" ? parsed.amount : null,
    currency: typeof parsed.currency === "string" ? parsed.currency : null,
    vendor_name:
      typeof parsed.vendor_name === "string" ? parsed.vendor_name : null,
    tax_id: typeof parsed.tax_id === "string" ? parsed.tax_id : null,
    category: typeof parsed.category === "string" ? parsed.category : null,
    confidence:
      typeof parsed.confidence === "number"
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.5,
  };
}

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is not set");
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  }

  async extractFromDocument(
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<ExtractionResult> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });

    const filePart: Part = {
      inlineData: {
        data: fileBuffer.toString("base64"),
        mimeType: mimeType as Parameters<typeof model.generateContent>[0] extends infer T ? string : string,
      },
    };

    // First attempt
    try {
      const result = await model.generateContent([EXTRACTION_PROMPT, filePart]);
      const text = result.response.text();
      return parseExtractionJson(text);
    } catch (firstError) {
      // Retry once with a stricter prompt
      try {
        const result = await model.generateContent([
          STRICT_EXTRACTION_PROMPT,
          filePart,
        ]);
        const text = result.response.text();
        return parseExtractionJson(text);
      } catch {
        throw new Error(
          `Gemini extraction failed after retry: ${firstError instanceof Error ? firstError.message : String(firstError)}`
        );
      }
    }
  }
}
