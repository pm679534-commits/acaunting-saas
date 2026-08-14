export interface ExtractionResult {
  date: string | null;
  amount: number | null;
  currency: string | null;
  vendor_name: string | null;
  tax_id: string | null;
  category: string | null;
  confidence: number;
}

export interface AIProvider {
  extractFromDocument(
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<ExtractionResult>;
}
