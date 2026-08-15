interface DocumentRow {
  id: string;
  original_filename: string;
  raw_extraction: Record<string, unknown> | null;
  edited_fields: Record<string, unknown> | null;
  created_at: string;
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
    .replace(/'/g, "&apos;");
}

export function generate1CXml(documents: DocumentRow[]): string {
  const timestamp = new Date().toISOString();

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<КоммерческаяИнформация ВерсияСхемы="2.10" ДатаФормирования="' + escapeXml(timestamp) + '">\n';
  xml += '  <Документы>\n';

  documents.forEach((doc, index) => {
    const fields = getFields(doc);
    const docId = `DOC-${String(index + 1).padStart(6, "0")}`;

    xml += '    <Документ>\n';
    xml += '      <Ид>' + escapeXml(docId) + '</Ид>\n';
    xml += '      <Номер>' + escapeXml(String(index + 1)) + '</Номер>\n';
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
  });

  xml += '  </Документы>\n';
  xml += '</КоммерческаяИнформация>\n';

  return xml;
}
