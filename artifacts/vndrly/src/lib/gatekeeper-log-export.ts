import type { VisitorRow } from "@/lib/visits-api";
import { normalizePlateState, plateMatchKey } from "@workspace/plate-state";

export type GateLogExportRow = {
  plate: string;
  visitor: string;
  company: string;
  phone: string;
  email: string;
  site: string;
  host: string;
  purpose: string;
  checkIn: string;
  checkOut: string;
  status: string;
};

export function normalizePlate(value: string | null | undefined): string {
  return (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function latestVisitForPlate(
  visits: VisitorRow[],
  state: string | null,
  plate: string,
): VisitorRow | null {
  const normalized = normalizePlate(plate);
  if (!normalized) return null;
  const normalizedState = normalizePlateState(state);
  const exactKey = plateMatchKey(normalizedState, plate);
  return visits
    .filter((visit) => {
      if (normalizePlate(visit.vehiclePlate) !== normalized) return false;
      const visitState = normalizePlateState(visit.plateState);
      return !normalizedState || !visitState || plateMatchKey(visitState, visit.vehiclePlate) === exactKey;
    })
    .sort((a, b) => {
      const priority = (visit: VisitorRow) =>
        exactKey && plateMatchKey(visit.plateState, visit.vehiclePlate) === exactKey ? 0 : 1;
      return priority(a) - priority(b) || Date.parse(b.checkInTime) - Date.parse(a.checkInTime);
    })[0] ?? null;
}

function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function toGateLogRows(visits: VisitorRow[]): GateLogExportRow[] {
  return visits.map((visit) => ({
    plate: visit.vehiclePlate ?? "",
    visitor: `${visit.firstName} ${visit.lastName}`.trim(),
    company: visit.company ?? "",
    phone: visit.phone ?? "",
    email: visit.email ?? "",
    site: visit.siteName ?? "",
    host: visit.hostPartnerName ?? visit.hostVendorName ?? "",
    purpose: visit.purpose ?? "",
    checkIn: formatDate(visit.checkInTime),
    checkOut: formatDate(visit.checkOutTime),
    status: visit.checkOutTime ? (visit.autoCheckedOut ? "Auto checked out" : "Checked out") : "On site",
  }));
}

const columns: Array<{ key: keyof GateLogExportRow; label: string }> = [
  { key: "plate", label: "License Plate" },
  { key: "visitor", label: "Visitor" },
  { key: "company", label: "Company" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "site", label: "Site" },
  { key: "host", label: "Host" },
  { key: "purpose", label: "Purpose" },
  { key: "checkIn", label: "Check In" },
  { key: "checkOut", label: "Check Out" },
  { key: "status", label: "Status" },
];

function xml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildExcelXml(rows: GateLogExportRow[]): string {
  const header = columns.map(({ label }) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${xml(label)}</Data></Cell>`).join("");
  const body = rows.map((row) => `<Row>${columns.map(({ key }) => `<Cell><Data ss:Type="String">${xml(row[key])}</Data></Cell>`).join("")}</Row>`).join("");
  return `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#D9EAF7" ss:Pattern="Solid"/></Style></Styles><Worksheet ss:Name="Gate Log"><Table><Row>${header}</Row>${body}</Table></Worksheet></Workbook>`;
}

export function buildWordHtml(rows: GateLogExportRow[]): string {
  const header = columns.map(({ label }) => `<th>${xml(label)}</th>`).join("");
  const body = rows.map((row) => `<tr>${columns.map(({ key }) => `<td>${xml(row[key])}</td>`).join("")}</tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#172033}h1{color:#163b63}table{border-collapse:collapse;width:100%;font-size:9pt}th{background:#d9eaf7}th,td{border:1px solid #9aa9b8;padding:5px;text-align:left;vertical-align:top}</style></head><body><h1>VNDRLY Gate Log</h1><p>Generated ${xml(new Date().toLocaleString())}</p><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

export function downloadBlob(contents: BlobPart, type: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function exportExcel(rows: GateLogExportRow[]): void {
  downloadBlob(buildExcelXml(rows), "application/vnd.ms-excel;charset=utf-8", "vndrly-gate-log.xls");
}

export function exportWord(rows: GateLogExportRow[]): void {
  downloadBlob(buildWordHtml(rows), "application/msword;charset=utf-8", "vndrly-gate-log.doc");
}

export async function exportPdf(rows: GateLogExportRow[]): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const pageWidth = document.internal.pageSize.getWidth();
  const widths = [48, 68, 60, 58, 80, 58, 62, 84, 74, 74, 56];
  const rowHeight = 28;
  const margin = 24;
  let y = 54;
  const drawHeader = () => {
    document.setFont("helvetica", "bold"); document.setFontSize(16); document.text("VNDRLY Gate Log", margin, 28);
    document.setFontSize(7); document.setFillColor(217, 234, 247);
    let x = margin;
    for (let i = 0; i < columns.length; i += 1) { document.rect(x, y - 12, widths[i], 20, "F"); document.text(columns[i].label, x + 3, y); x += widths[i]; }
    y += 18; document.setFont("helvetica", "normal");
  };
  drawHeader();
  for (const row of rows) {
    if (y + rowHeight > document.internal.pageSize.getHeight() - margin) { document.addPage(); y = 54; drawHeader(); }
    let x = margin;
    for (let i = 0; i < columns.length; i += 1) {
      const value = row[columns[i].key];
      document.rect(x, y - 12, widths[i], rowHeight);
      document.text(document.splitTextToSize(value, widths[i] - 6).slice(0, 3), x + 3, y);
      x += widths[i];
    }
    y += rowHeight;
  }
  document.setFontSize(7); document.text(`Generated ${new Date().toLocaleString()}`, pageWidth - margin, document.internal.pageSize.getHeight() - 10, { align: "right" });
  document.save("vndrly-gate-log.pdf");
}
