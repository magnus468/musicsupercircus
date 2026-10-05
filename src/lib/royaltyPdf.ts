import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type Fee = { description: string; amount: number };
export type RoyaltyStatementData = {
  period_start: string; period_end: string; statement_date: string;
  opening_balance: number; expenses_sek: number; income_downloads_sek: number; income_streams_sek: number;
  vat_rate: number; vat_sek: number; payable_excl_vat: number; payable_incl_vat: number;
  minimum_payout: number; outstanding_balance: number; fees: Fee[];
};
export type Party = { name: string; lines: string[] };

export const PAYER: Party = {
  name: "Music Super Circus Extravaganza AB",
  lines: ["Västmannagatan 6", "11124 Stockholm", "Sweden", "SE556814348001"],
};

const kr = (n: number) =>
  `${(Math.abs(n) < 0.005 ? 0 : n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK`;

export const buildRoyaltyPdf = (s: RoyaltyStatementData, payee: Party) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold").setFontSize(16).text(PAYER.name, 40, 50);

  const block = (x: number, title: string, p: Party) => {
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(110).text(title, x, 85);
    doc.setTextColor(0).setFont("helvetica", "bold").setFontSize(10).text(p.name, x, 100);
    doc.setFont("helvetica", "normal");
    p.lines.filter(Boolean).forEach((l, i) => doc.text(l, x, 114 + i * 13));
  };
  block(40, "Payer:", PAYER);
  block(250, "Payee:", payee);
  doc.setFontSize(9).setTextColor(110).text("Date:", 430, 85).text("Period:", 430, 125);
  doc.setTextColor(0).setFont("helvetica", "bold").setFontSize(10)
    .text(s.statement_date, 430, 100).text(`${s.period_start} - ${s.period_end}`, 430, 140);

  const income = s.income_downloads_sek + s.income_streams_sek;
  autoTable(doc, {
    startY: 190, theme: "plain", styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 0: { cellWidth: 200, fontStyle: "bold" }, 2: { halign: "right" } },
    body: [
      ["Statement Summary", "Opening Balance", kr(s.opening_balance)],
      ["", "Expenses Amount", kr(-s.expenses_sek)],
      ["", "Incomes Amount", kr(income)],
      ["", "Payable Amount VAT Excluded", kr(s.payable_excl_vat)],
      ["", `VAT (${(s.vat_rate * 100).toFixed(1)} %)`, kr(s.vat_sek)],
      ["", { content: "Payable Amount VAT Included", styles: { fontStyle: "bold" } }, { content: kr(s.payable_incl_vat), styles: { fontStyle: "bold" } }],
      ["", "Outstanding Balance", kr(s.outstanding_balance)],
    ],
    didDrawCell: (d) => {
      if (d.row.index === 1 && d.column.index === 0) {
        doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(110)
          .text(doc.splitTextToSize("Amount in outstanding balance is reported to the next statement.", 190), d.cell.x + 4, d.cell.y + 10);
        doc.setTextColor(0);
      }
    },
  });

  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 30;
  doc.setFont("helvetica", "bold").setFontSize(12).text(`${payee.name} (Contract)`, 40, y);
  const bold = { fontStyle: "bold" as const };
  autoTable(doc, {
    startY: y + 10, theme: "striped", styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 1: { halign: "right" } },
    body: [
      [{ content: "Fees", styles: bold }, { content: kr(-s.expenses_sek), styles: bold }],
      ...s.fees.map((f) => [f.description, kr(-f.amount)]),
      [{ content: "Digital", styles: bold }, { content: kr(income), styles: bold }],
      ["Downloads", kr(s.income_downloads_sek)],
      ["Streams", kr(s.income_streams_sek)],
    ],
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 25;
  autoTable(doc, {
    startY: y, theme: "plain", margin: { left: W / 2 }, styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 1: { halign: "right" } },
    body: [
      ["Opening Balance", kr(s.opening_balance)],
      ["Operations Amount", kr(income - s.expenses_sek)],
      ["Minimum Payout", kr(s.minimum_payout)],
      ["Payable Amount", kr(s.payable_excl_vat)],
      ["Outstanding Balance", kr(s.outstanding_balance)],
    ],
  });
  return doc;
};
