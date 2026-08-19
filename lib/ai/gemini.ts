import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import type { AIProvider, ExtractionResult, LineItem } from "./provider";
import { validateModel, type AllowedModelId } from "./models";

const EXTRACTION_PROMPT = `You are a document data extraction assistant for Azerbaijani accounting firms.
Analyze the provided invoice, receipt, or tabular document (payroll sheet, itemized statement, etc.) and extract data.

IMPORTANT: Detect the document type automatically:
- If it's a SINGLE-ITEM document (invoice, receipt): extract one summary record with the schema below.
- If it's a MULTI-ROW TABULAR document (payroll sheet with multiple employees, itemized statement with multiple line items): extract each row as a separate line item using the "line_items" array.

AZERBAIJANI DATE PARSING RULES:
- Convert Azerbaijani month names strictly to ISO YYYY-MM-DD format:
  * Yanvar → 01, Fevral → 02, Mart → 03, Aprel → 04, May → 05, İyun → 06
  * İyul → 07, Avqust → 08, Sentyabr → 09, Oktyabr → 10, Noyabr → 11, Dekabr → 12
- Date Hierarchy: The PRIMARY date (document_date) MUST be the main document creation date (e.g., the date shown under "HESAB-FAKTURA" heading).
- DO NOT use contract reference dates (e.g., "01 Mart 2025-ci il tarixli müqavilə") as the main document date.
- For documents with multiple dates, prioritize the invoice/document issue date over any contract/reference dates.

AUTO-CATEGORIZATION LOGIC:
Analyze line item descriptions and vendor name to infer the most appropriate category:
- "Təmir və Texniki Xidmət" → radiator, silindr, tormoz, avto ehtiyat hissələri, təmir xidmətləri
- "İT və Proqram Təminatı" → IT, proqram təminatı, server, kompüter avadanlığı, hosting
- "Dəftərxana və Ofis Xərcləri" → ofis ləvazimatı, kağız, qələm, kartric
- "Məsləhət və Konsaltinq Xidmətləri" → 1C, mühasibatlıq, konsaltinq, məsləhət
- "Nəqliyyat və Logistika" → benzin, yanacaq, daşınma, kuryer, logistika
- "Kommunal Xidmətlər" → elektrik, su, qaz, istilik
- "Əmək haqqı" → əmək haqqı, maaş, əlavə
- "Mal/Xidmət" → general goods or services that don't fit specific categories
- "Ümumi Xidmətlər" → default for uncertain cases
NEVER return "Tapılmadı" or leave category empty. Always provide the best matching category or use "Ümumi Xidmətlər" as fallback.

NUMERICAL PRECISION:
- Currency defaults to "AZN" unless explicit foreign symbol ($, €, ₺, ₽) is present.
- Clean up spaces in amounts (e.g., "6 105,00" → 6105.00).
- Parse comma as decimal separator for Azerbaijani format (e.g., "1.234,56" → 1234.56).

Return ONLY a valid JSON object with no markdown, no code blocks, no extra text.

For SINGLE-ITEM documents (invoices, receipts), use this schema:
{
  "date": "YYYY-MM-DD string or null if not found",
  "amount": number or null (total amount as a number, no currency symbols),
  "currency": "AZN|USD|EUR|TRY|RUB or null",
  "vendor_name": "company/person name string or null",
  "tax_id": "VÖEN (taxpayer ID) 10-digit string or null",
  "category": "one of the categories listed above, never null or empty",
  "confidence": number between 0 and 1 representing overall extraction confidence
}

For MULTI-ROW TABULAR documents (payroll sheets, itemized statements), use this schema:
{
  "date": "document date or null",
  "vendor_name": "company/entity name if present or null",
  "tax_id": "VÖEN if present or null",
  "currency": "AZN|USD|EUR|TRY|RUB or null (common currency for all items)",
  "confidence": number between 0 and 1,
  "line_items": [
    {
      "description": "line item description (e.g. job title, item name, product)",
      "amount": number or null (amount for this line),
      "currency": "currency for this line if different from document currency, or null",
      "date": "date for this line if different from document date, or null",
      "category": "category for this line based on description, never null or empty",
      "quantity": number or null (quantity/count, default 1 if not present),
      "unit": "unit of measurement (e.g. ədəd, kg, litr, saat) or null"
    }
  ]
}

Detection guidelines:
- If the document has a visible table structure with multiple rows of similar data (e.g. employee list, product list), use line_items.
- If it's a single transaction (one invoice, one receipt), use the summary schema (no line_items).
- Payroll sheets ("Əmək haqqı cədvəli", "stat cədvəli") with multiple employees → use line_items.
- Single invoice/receipt → summary schema only.`;

const STRICT_EXTRACTION_PROMPT = `${EXTRACTION_PROMPT}

CRITICAL: Return ONLY the JSON object. No explanation. No markdown. No \`\`\`. Just the raw JSON.`;

function parseExtractionJson(text: string): ExtractionResult {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const parsed = JSON.parse(cleaned);

  const result: ExtractionResult = {
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

  // If line_items array exists, parse and add it
  if (Array.isArray(parsed.line_items) && parsed.line_items.length > 0) {
    result.line_items = parsed.line_items.map((item: any): LineItem => ({
      description: typeof item.description === "string" ? item.description : null,
      amount: typeof item.amount === "number" ? item.amount : null,
      currency: typeof item.currency === "string" ? item.currency : null,
      date: typeof item.date === "string" ? item.date : null,
      category: typeof item.category === "string" ? item.category : null,
      quantity: typeof item.quantity === "number" ? item.quantity : null,
      unit: typeof item.unit === "string" ? item.unit : null,
    }));
  }

  return result;
}

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI;
  private modelFallbackChain: string[];

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is not set");
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelFallbackChain = [
      "gemini-2.5-flash-latest",
      "gemini-2.5-pro",
      "gemini-2.5-flash",
    ];
  }

  private isModelNotFoundError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return (
      message.includes("404") ||
      message.includes("not found") ||
      message.includes("does not exist") ||
      message.includes("billing") ||
      message.includes("quota") ||
      message.includes("permission")
    );
  }

  private async tryExtractWithModel(
    modelName: string,
    filePart: Part
  ): Promise<ExtractionResult> {
    const model = this.genAI.getGenerativeModel({ model: modelName });

    try {
      const result = await model.generateContent([EXTRACTION_PROMPT, filePart]);
      const text = result.response.text();
      return parseExtractionJson(text);
    } catch (firstError) {
      try {
        const result = await model.generateContent([
          STRICT_EXTRACTION_PROMPT,
          filePart,
        ]);
        const text = result.response.text();
        return parseExtractionJson(text);
      } catch {
        throw firstError;
      }
    }
  }

  async extractFromDocument(
    fileBuffer: Buffer,
    mimeType: string,
    modelId?: string
  ): Promise<ExtractionResult> {
    const filePart: Part = {
      inlineData: {
        data: fileBuffer.toString("base64"),
        mimeType,
      },
    };

    let modelsToTry: string[];

    if (modelId) {
      // Validate and use the specified model, with fallback chain
      const validatedModel = validateModel(modelId);
      modelsToTry = [
        validatedModel,
        ...this.modelFallbackChain.filter((m) => m !== validatedModel),
      ];
    } else {
      // Use default fallback chain
      modelsToTry = this.modelFallbackChain;
    }

    let lastError: Error | null = null;

    for (const modelName of modelsToTry) {
      try {
        const result = await this.tryExtractWithModel(modelName, filePart);
        console.log(`Gemini extraction succeeded with model: ${modelName}`);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (this.isModelNotFoundError(error)) {
          console.log(`Model ${modelName} not available, trying next fallback`);
          continue;
        } else {
          throw new Error(
            `Gemini extraction failed with ${modelName}: ${lastError.message}`
          );
        }
      }
    }

    throw new Error(
      `All Gemini models failed. Last error: ${lastError?.message ?? "Unknown error"}`
    );
  }
}
