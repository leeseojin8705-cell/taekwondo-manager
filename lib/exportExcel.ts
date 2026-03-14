import * as XLSX from "xlsx";

export type ExcelCellValue = string | number | boolean | null;

export type ExcelColumn<T extends Record<string, unknown>> = {
  header: string;
  key: keyof T;
  width?: number;
  formatter?: (value: T[keyof T], row: T) => ExcelCellValue | undefined;
};

export type ExcelSheetConfig<T extends Record<string, unknown>> = {
  sheetName: string;
  columns: ExcelColumn<T>[];
  rows: T[];
};

type LooseExcelColumn = {
  header: string;
  key: string;
  width?: number;
};

type LooseExcelSheetConfig = {
  sheetName: string;
  columns: LooseExcelColumn[];
  rows: Record<string, unknown>[];
};

function buildSheetRows<T extends Record<string, unknown>>(
  columns: ExcelColumn<T>[],
  rows: T[]
): Record<string, ExcelCellValue>[] {
  return rows.map((row) => {
    const nextRow: Record<string, ExcelCellValue> = {};

    for (const column of columns) {
      const rawValue = row[column.key];
      const formattedValue = column.formatter
        ? column.formatter(rawValue, row)
        : rawValue;

      nextRow[column.header] = normalizeCellValue(formattedValue);
    }

    return nextRow;
  });
}

function buildLooseSheetRows(
  columns: LooseExcelColumn[],
  rows: Record<string, unknown>[]
): Record<string, ExcelCellValue>[] {
  return rows.map((row) => {
    const nextRow: Record<string, ExcelCellValue> = {};

    for (const column of columns) {
      const rawValue = row[column.key];
      nextRow[column.header] = normalizeCellValue(rawValue);
    }

    return nextRow;
  });
}

function normalizeCellValue(value: unknown): ExcelCellValue {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : "";
  if (typeof value === "boolean") return value;

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function applyColumnWidths(
  worksheet: XLSX.WorkSheet,
  columns: { width?: number }[]
) {
  worksheet["!cols"] = columns.map((column) => ({
    wch: column.width ?? 18,
  }));
}

function sanitizeSheetName(sheetName: string) {
  const cleaned = (sheetName || "Sheet1")
    .replace(/[\\/*?:[\]]/g, "")
    .trim();

  if (!cleaned) return "Sheet1";
  return cleaned.slice(0, 31);
}

function ensureExcelExtension(fileName: string) {
  return fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
}

function createWorksheetFromColumns(
  columns: { header: string }[],
  rows: Record<string, ExcelCellValue>[]
) {
  if (rows.length > 0) {
    return XLSX.utils.json_to_sheet(rows);
  }

  const emptyRow = columns.reduce<Record<string, ExcelCellValue>>((acc, column) => {
    acc[column.header] = "";
    return acc;
  }, {});

  const worksheet = XLSX.utils.json_to_sheet([emptyRow]);
  return worksheet;
}

export function exportSingleSheetExcel<T extends Record<string, unknown>>({
  fileName,
  sheetName,
  columns,
  rows,
}: {
  fileName: string;
  sheetName: string;
  columns: ExcelColumn<T>[];
  rows: T[];
}) {
  const workbook = XLSX.utils.book_new();
  const worksheetRows = buildSheetRows(columns, rows);
  const worksheet = createWorksheetFromColumns(columns, worksheetRows);

  applyColumnWidths(worksheet, columns);
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    sanitizeSheetName(sheetName)
  );
  XLSX.writeFile(workbook, ensureExcelExtension(fileName));
}

export function exportMultiSheetExcel(
  fileName: string,
  sheets: LooseExcelSheetConfig[]
) {
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const worksheetRows = buildLooseSheetRows(sheet.columns, sheet.rows);
    const worksheet = createWorksheetFromColumns(sheet.columns, worksheetRows);

    applyColumnWidths(worksheet, sheet.columns);
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      sanitizeSheetName(sheet.sheetName)
    );
  }

  XLSX.writeFile(workbook, ensureExcelExtension(fileName));
}