import ExcelJS from "exceljs";

interface DocumentRow {
  id: string;
  original_filename: string;
  raw_extraction: Record<string, unknown> | null;
  edited_fields: Record<string, unknown> | null;
  created_at: string;
  document_line_items?: Array<{
    line_number: number;
    description: string | null;
    amount: number | null;
    currency: string | null;
    date: string | null;
    category: string | null;
    quantity: number | null;
    unit: string | null;
  }>;
}

function getFields(doc: DocumentRow) {
  const source =
    doc.edited_fields && Object.keys(doc.edited_fields).length > 0
      ? doc.edited_fields
      : doc.raw_extraction ?? {};
  return {
    date: (source.date as string) ?? "",
    vendor_name: (source.vendor_name as string) ?? "",
    tax_id: (source.tax_id as string) ?? "",
    category: (source.category as string) ?? "",
    amount: (source.amount as number) ?? "",
    currency: (source.currency as string) ?? "AZN",
  };
}

// Sanitize Excel cell values to prevent formula injection
function sanitizeExcelValue(value: string | number | null | undefined): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value;

  const str = String(value);
  // If the string starts with dangerous characters, prefix with single quote
  if (str.length > 0 && /^[=+\-@]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export async function generateExcel(documents: DocumentRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HesabSənəd";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Sənədlər", {
    pageSetup: { fitToPage: true, orientation: "landscape" },
  });

  sheet.columns = [
    { header: "№", key: "index", width: 6 },
    { header: "Tarix", key: "date", width: 14 },
    { header: "Satıcı", key: "vendor_name", width: 30 },
    { header: "VÖEN", key: "tax_id", width: 14 },
    { header: "Məhsul/Xidmət adı", key: "product_name", width: 35 },
    { header: "Miqdar", key: "quantity", width: 10 },
    { header: "Ölçü vahidi", key: "unit", width: 12 },
    { header: "Kateqoriya", key: "category", width: 20 },
    { header: "Məbləğ", key: "amount", width: 14 },
    { header: "Valyuta", key: "currency", width: 10 },
    { header: "Fayl adı", key: "original_filename", width: 30 },
    { header: "Yüklənmə tarixi", key: "created_at", width: 20 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
    };
  });

  let rowIndex = 0;

  documents.forEach((doc) => {
    const fields = getFields(doc);

    // If document has line items, export each line item as a separate row
    if (doc.document_line_items && doc.document_line_items.length > 0) {
      doc.document_line_items.forEach((lineItem) => {
        rowIndex++;
        const row = sheet.addRow({
          index: rowIndex,
          date: sanitizeExcelValue(lineItem.date || fields.date),
          vendor_name: sanitizeExcelValue(fields.vendor_name),  // Use document-level vendor, NOT line item description
          tax_id: sanitizeExcelValue(fields.tax_id),
          product_name: sanitizeExcelValue(lineItem.description),  // Line item description goes here
          quantity: typeof lineItem.quantity === "number" ? lineItem.quantity : 1,
          unit: sanitizeExcelValue(lineItem.unit || "ədəd"),
          category: sanitizeExcelValue(lineItem.category || fields.category),
          amount: lineItem.amount,
          currency: sanitizeExcelValue(lineItem.currency || fields.currency),
          original_filename: sanitizeExcelValue(doc.original_filename),
          created_at: sanitizeExcelValue(new Date(doc.created_at).toLocaleDateString("az-AZ")),
        });

        row.height = 18;

        // Alternate row shading
        if (rowIndex % 2 === 0) {
          row.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF8F9FF" },
            };
          });
        }

        // Amount column — number format
        const amountCell = row.getCell("amount");
        if (typeof lineItem.amount === "number") {
          amountCell.numFmt = "#,##0.00";
        }

        // Quantity column — number format
        const quantityCell = row.getCell("quantity");
        quantityCell.numFmt = "#,##0.##";
      });
    } else {
      // Single-item document: export summary row (no product name/quantity/unit)
      rowIndex++;
      const row = sheet.addRow({
        index: rowIndex,
        date: sanitizeExcelValue(fields.date),
        vendor_name: sanitizeExcelValue(fields.vendor_name),
        tax_id: sanitizeExcelValue(fields.tax_id),
        product_name: "",  // Empty for single-item docs
        quantity: "",
        unit: "",
        category: sanitizeExcelValue(fields.category),
        amount: fields.amount,
        currency: sanitizeExcelValue(fields.currency),
        original_filename: sanitizeExcelValue(doc.original_filename),
        created_at: sanitizeExcelValue(new Date(doc.created_at).toLocaleDateString("az-AZ")),
      });

      row.height = 18;

      // Alternate row shading
      if (rowIndex % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8F9FF" },
          };
        });
      }

      // Amount column — number format
      const amountCell = row.getCell("amount");
      if (typeof fields.amount === "number") {
        amountCell.numFmt = "#,##0.00";
      }
    }
  });

  // Freeze header row
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
