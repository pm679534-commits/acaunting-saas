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
    amount: (source.amount as number) ?? 0,
    currency: (source.currency as string) ?? "AZN",
  };
}

function escapeXml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return "";
  const text = String(str);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Remove any control characters that could break XML
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

// Validate and sanitize quantity to ensure it's a safe numeric value
function sanitizeQuantity(qty: number | null | undefined): number {
  if (qty === null || qty === undefined || isNaN(qty) || !isFinite(qty)) {
    return 1;
  }
  // Clamp to reasonable range to prevent abuse
  return Math.max(0.001, Math.min(1000000, qty));
}

export function generate1CXml(documents: DocumentRow[]): string {
  const timestamp = new Date().toISOString();

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<КоммерческаяИнформация ВерсияСхемы="2.10" ДатаФормирования="' + escapeXml(timestamp) + '">\n';
  xml += '  <Документы>\n';

  let docCounter = 0;

  documents.forEach((doc) => {
    const fields = getFields(doc);

    // If document has line items, generate one XML document per line item
    if (doc.document_line_items && doc.document_line_items.length > 0) {
      doc.document_line_items.forEach((lineItem) => {
        docCounter++;
        const docId = `DOC-${String(docCounter).padStart(6, "0")}`;
        const itemAmount = lineItem.amount ?? 0;
        const itemCurrency = lineItem.currency || fields.currency;
        const itemDate = lineItem.date || fields.date || timestamp.split("T")[0];
        const itemCategory = lineItem.category || fields.category || "Товар/Услуга";
        const itemQuantity = sanitizeQuantity(lineItem.quantity);
        const itemUnit = lineItem.unit || "ədəd";
        const pricePerUnit = itemQuantity > 0 ? itemAmount / itemQuantity : itemAmount;

        xml += '    <Документ>\n';
        xml += '      <Ид>' + escapeXml(docId) + '</Ид>\n';
        xml += '      <Номер>' + escapeXml(String(docCounter)) + '</Номер>\n';
        xml += '      <Дата>' + escapeXml(itemDate) + '</Дата>\n';
        xml += '      <ХозОперация>Поступление товаров и услуг</ХозОперация>\n';
        xml += '      <Роль>Продавец</Роль>\n';
        xml += '      <Валюта>' + escapeXml(itemCurrency) + '</Валюта>\n';
        xml += '      <Курс>1</Курс>\n';
        xml += '      <Сумма>' + escapeXml(itemAmount.toFixed(2)) + '</Сумма>\n';
        xml += '      <Комментарий>' + escapeXml(doc.original_filename + " - " + (lineItem.description || "")) + '</Комментарий>\n';

        xml += '      <Контрагенты>\n';
        xml += '        <Контрагент>\n';
        xml += '          <Ид>' + escapeXml(fields.tax_id || "UNKNOWN") + '</Ид>\n';
        xml += '          <Наименование>' + escapeXml(fields.vendor_name || "Не указано") + '</Наименование>\n';  // Use document vendor, not line item description
        xml += '          <Роль>Продавец</Роль>\n';
        xml += '          <ПолноеНаименование>' + escapeXml(fields.vendor_name || "Не указано") + '</ПолноеНаименование>\n';
        if (fields.tax_id) {
          xml += '          <ИНН>' + escapeXml(fields.tax_id) + '</ИНН>\n';
        }
        xml += '        </Контрагент>\n';
        xml += '      </Контрагенты>\n';

        xml += '      <Товары>\n';
        xml += '        <Товар>\n';
        xml += '          <Ид>ITEM-' + escapeXml(docId) + '</Ид>\n';
        xml += '          <Наименование>' + escapeXml(lineItem.description || itemCategory) + '</Наименование>\n';  // Line item description as product name
        xml += '          <БазовыеЕдиницы Код="' + escapeXml(itemUnit) + '">' + escapeXml(itemUnit) + '</БазовыеЕдиницы>\n';
        xml += '          <Количество>' + escapeXml(itemQuantity.toFixed(3)) + '</Количество>\n';  // Actual quantity from line item
        xml += '          <ЦенаЗаЕдиницу>' + escapeXml(pricePerUnit.toFixed(2)) + '</ЦенаЗаЕдиницу>\n';
        xml += '          <Сумма>' + escapeXml(itemAmount.toFixed(2)) + '</Сумма>\n';
        xml += '        </Товар>\n';
        xml += '      </Товары>\n';

        xml += '    </Документ>\n';
      });
    } else {
      // Single-item document: generate one XML document
      docCounter++;
      const docId = `DOC-${String(docCounter).padStart(6, "0")}`;

      xml += '    <Документ>\n';
      xml += '      <Ид>' + escapeXml(docId) + '</Ид>\n';
      xml += '      <Номер>' + escapeXml(String(docCounter)) + '</Номер>\n';
      xml += '      <Дата>' + escapeXml(fields.date || timestamp.split("T")[0]) + '</Дата>\n';
      xml += '      <ХозОперация>Поступление товаров и услуг</ХозОперация>\n';
      xml += '      <Роль>Продавец</Роль>\n';
      xml += '      <Валюта>' + escapeXml(fields.currency) + '</Валюта>\n';
      xml += '      <Курс>1</Курс>\n';
      xml += '      <Сумма>' + escapeXml(fields.amount.toFixed(2)) + '</Сумма>\n';
      xml += '      <Комментарий>' + escapeXml(doc.original_filename) + '</Комментарий>\n';

      xml += '      <Контрагенты>\n';
      xml += '        <Контрагент>\n';
      xml += '          <Ид>' + escapeXml(fields.tax_id || "UNKNOWN") + '</Ид>\n';
      xml += '          <Наименование>' + escapeXml(fields.vendor_name || "Не указано") + '</Наименование>\n';
      xml += '          <Роль>Продавец</Роль>\n';
      xml += '          <ПолноеНаименование>' + escapeXml(fields.vendor_name || "Не указано") + '</ПолноеНаименование>\n';
      if (fields.tax_id) {
        xml += '          <ИНН>' + escapeXml(fields.tax_id) + '</ИНН>\n';
      }
      xml += '        </Контрагент>\n';
      xml += '      </Контрагенты>\n';

      xml += '      <Товары>\n';
      xml += '        <Товар>\n';
      xml += '          <Ид>ITEM-' + escapeXml(docId) + '</Ид>\n';
      xml += '          <Наименование>' + escapeXml(fields.category || "Товар/Услуга") + '</Наименование>\n';
      xml += '          <Количество>1</Количество>\n';
      xml += '          <ЦенаЗаЕдиницу>' + escapeXml(fields.amount.toFixed(2)) + '</ЦенаЗаЕдиницу>\n';
      xml += '          <Сумма>' + escapeXml(fields.amount.toFixed(2)) + '</Сумма>\n';
      xml += '        </Товар>\n';
      xml += '      </Товары>\n';

      xml += '    </Документ>\n';
    }
  });

  xml += '  </Документы>\n';
  xml += '</КоммерческаяИнформация>\n';

  return xml;
}
