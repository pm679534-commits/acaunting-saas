export interface LineItem {
  description: string | null;
  amount: number | null;
  currency: string | null;
  date: string | null;
  category: string | null;
}

export interface ExtractionResult {
  date: string | null;
  amount: number | null;
  currency: string | null;
  vendor_name: string | null;
  tax_id: string | null;
  category: string | null;
  confidence: number;
  // Line items for tabular documents (payroll sheets, itemized statements, etc.)
  // If present, this is a multi-row document and line_items should be used instead of the summary fields
  line_items?: LineItem[];
}

export interface AIProvider {
  extractFromDocument(
    fileBuffer: Buffer,
    mimeType: string,
    modelId?: string
  ): Promise<ExtractionResult>;
}
