import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE_WIDTH = 792;
const PAGE_HEIGHT = 612;
const MARGIN = 34;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
const PINK = rgb(0.93, 0.047, 0.365);
const NAVY = rgb(0.078, 0.125, 0.2);
const MUTED = rgb(0.396, 0.459, 0.545);
const BORDER = rgb(0.847, 0.878, 0.918);
const PALE = rgb(0.969, 0.98, 0.992);
const WHITE = rgb(1, 1, 1);
const RED = rgb(0.62, 0.106, 0.106);
const RED_BG = rgb(1, 0.91, 0.91);
const YELLOW = rgb(0.54, 0.353, 0);
const YELLOW_BG = rgb(1, 0.953, 0.76);
const GREEN = rgb(0.094, 0.475, 0.306);
const GREEN_BG = rgb(0.875, 0.961, 0.914);
const BLUE_BG = rgb(0.929, 0.949, 0.973);

const STATUS_LABELS = {
  "remediation-required": "Remediation Recommended",
  "remediation-recommended": "Remediation Recommended",
  "remediation-review-recommended": "Review Recommended",
  "needs-review": "Review Recommended",
  reviewed: "Reviewed",
  pass: "Pass",
  manual: "Manual Validation",
  informational: "Informational",
  unknown: "Unknown"
};

const SEVERITY_LABELS = { high: "High", medium: "Medium", low: "Low", info: "Info" };

function clean(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?")
    .trim();
}

function valueText(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(valueText).filter(Boolean).join("\n");
  if (typeof value === "object") {
    if (value._link || value.link) {
      const link = value._link || value.link;
      return clean(link.label || link.url || "");
    }
    return clean(value.label ?? value.value ?? value.text ?? "");
  }
  return clean(value);
}

function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return clean(value);
  return date.toLocaleString("en-US", {
    year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit"
  });
}

function wrapText(text, font, size, maxWidth) {
  const paragraphs = clean(text).split("\n");
  const lines = [];
  for (const paragraph of paragraphs) {
    if (!paragraph) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let line = "";
    for (const originalWord of words) {
      let word = originalWord;
      while (font.widthOfTextAtSize(word, size) > maxWidth && word.length > 1) {
        let end = word.length - 1;
        while (end > 1 && font.widthOfTextAtSize(`${word.slice(0, end)}-`, size) > maxWidth) end -= 1;
        const part = `${word.slice(0, end)}-`;
        if (line) lines.push(line);
        lines.push(part);
        line = "";
        word = word.slice(end);
      }
      const candidate = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [""];
}

function statusTone(status) {
  if (["remediation-required", "remediation-recommended"].includes(status)) return { ink: RED, fill: RED_BG };
  if (["needs-review", "remediation-review-recommended"].includes(status)) return { ink: YELLOW, fill: YELLOW_BG };
  if (["reviewed", "pass"].includes(status)) return { ink: GREEN, fill: GREEN_BG };
  return { ink: MUTED, fill: BLUE_BG };
}

class ReportWriter {
  constructor(doc, fonts) {
    this.doc = doc;
    this.fonts = fonts;
    this.pages = [];
    this.page = null;
    this.y = 0;
  }

  addPage(category = "Trusted Access Review") {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.pages.push(this.page);
    this.y = PAGE_HEIGHT - MARGIN - 22;
    this.page.drawText("CHECK POINT TRUSTED ACCESS REVIEW", {
      x: MARGIN, y: PAGE_HEIGHT - 24, size: 8, font: this.fonts.bold, color: MUTED
    });
    this.page.drawText(clean(category).slice(0, 80), {
      x: MARGIN, y: PAGE_HEIGHT - 36, size: 7, font: this.fonts.regular, color: MUTED
    });
    this.page.drawLine({
      start: { x: MARGIN, y: PAGE_HEIGHT - 42 }, end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 42 },
      thickness: 0.7, color: BORDER
    });
    return this.page;
  }

  ensure(height, category) {
    if (!this.page || this.y - height < 35) this.addPage(category);
  }

  text(text, options = {}) {
    const font = options.bold ? this.fonts.bold : this.fonts.regular;
    const size = options.size || 9;
    const width = options.width || CONTENT_WIDTH;
    const lineHeight = options.lineHeight || size * 1.3;
    const lines = wrapText(text, font, size, width);
    this.ensure((lines.length * lineHeight) + (options.after || 0), options.category);
    for (const line of lines) {
      this.page.drawText(line, { x: options.x || MARGIN, y: this.y, size, font, color: options.color || NAVY });
      this.y -= lineHeight;
    }
    this.y -= options.after || 0;
    return lines.length * lineHeight;
  }

  finish() {
    this.pages.forEach((page, index) => {
      page.drawLine({ start: { x: MARGIN, y: 26 }, end: { x: PAGE_WIDTH - MARGIN, y: 26 }, thickness: 0.6, color: BORDER });
      const footer = `Check Point Trusted Access Review - Page ${index + 1} of ${this.pages.length}`;
      page.drawText(footer, { x: PAGE_WIDTH - MARGIN - this.fonts.regular.widthOfTextAtSize(footer, 7), y: 14, size: 7, font: this.fonts.regular, color: MUTED });
    });
  }
}

function drawPill(writer, text, x, y, tone) {
  const size = 7.4;
  const width = writer.fonts.bold.widthOfTextAtSize(text, size) + 14;
  writer.page.drawRectangle({ x, y: y - 3, width, height: 16, color: tone.fill, borderColor: tone.ink, borderWidth: 0.4, borderRadius: 8 });
  writer.page.drawText(text, { x: x + 7, y: y + 1, size, font: writer.fonts.bold, color: tone.ink });
  return width;
}

function detailRows(check, hasTables) {
  const rows = [];
  if (check.recommendation) rows.push(["Recommendation", valueText(check.recommendation), false]);
  for (const warning of Array.isArray(check.recommendationWarning) ? check.recommendationWarning : [check.recommendationWarning]) {
    if (warning) rows.push(["", valueText(warning), true]);
  }
  if (!hasTables && check.evidence) rows.push(["Evidence", valueText(check.evidence), false]);
  if (check.details) rows.push(["Details", valueText(check.details), check.detailTone === "critical"]);
  for (const warning of Array.isArray(check.detailsWarning) ? check.detailsWarning : [check.detailsWarning]) {
    if (warning) rows.push(["", valueText(warning), true]);
  }
  for (const row of check.detailRows || []) {
    const bullets = Array.isArray(row.bullets) ? `\n${row.bullets.map((item) => `- ${item}`).join("\n")}` : "";
    rows.push([row.label || "Details", `${valueText(row.text ?? row.value)}${bullets}`, row.tone === "critical"]);
  }
  if (check.specialConsiderations?.text) rows.push(["Special Considerations", valueText(check.specialConsiderations.text), false]);
  if (check.source) rows.push(["Guide Section", valueText(check.source), false]);
  return rows;
}

function drawDetailRow(writer, label, value, critical, category) {
  const labelWidth = 112;
  const valueX = MARGIN + labelWidth + 8;
  const valueWidth = CONTENT_WIDTH - labelWidth - 8;
  const labelLines = label ? wrapText(label, writer.fonts.bold, 8.4, labelWidth - 5) : [];
  const valueLines = wrapText(value || "", critical ? writer.fonts.bold : writer.fonts.regular, 8.6, valueWidth);
  const lineCount = Math.max(1, labelLines.length, valueLines.length);
  const height = (lineCount * 11) + 3;
  writer.ensure(height, category);
  const rowTop = writer.y;
  labelLines.forEach((line, index) => writer.page.drawText(line, {
    x: MARGIN, y: rowTop - (index * 11), size: 8.4, font: writer.fonts.bold, color: MUTED
  }));
  valueLines.forEach((line, index) => writer.page.drawText(line, {
    x: valueX, y: rowTop - (index * 11), size: 8.6,
    font: critical ? writer.fonts.bold : writer.fonts.regular, color: critical ? RED : NAVY
  }));
  writer.y -= lineCount * 11;
  writer.y -= 3;
}

function drawTableHeader(writer, columns, widths, title, category) {
  const titleLines = title && title !== "Evidence" ? wrapText(title, writer.fonts.bold, 9.5, CONTENT_WIDTH) : [];
  const titleHeight = titleLines.length ? (titleLines.length * 12) + 6 : 0;
  writer.ensure(25 + titleHeight, category);
  if (titleHeight) {
    titleLines.forEach((line, index) => writer.page.drawText(line, {
      x: MARGIN, y: writer.y - (index * 12), size: 9.5, font: writer.fonts.bold, color: NAVY
    }));
    writer.y -= titleHeight;
  }
  const headerHeight = 24;
  writer.page.drawRectangle({ x: MARGIN, y: writer.y - headerHeight + 6, width: CONTENT_WIDTH, height: headerHeight, color: PALE });
  let x = MARGIN;
  columns.forEach((column, index) => {
    const lines = wrapText(column.toUpperCase(), writer.fonts.bold, 6.8, widths[index] - 10).slice(0, 2);
    lines.forEach((line, lineIndex) => writer.page.drawText(line, { x: x + 5, y: writer.y - (lineIndex * 8), size: 6.8, font: writer.fonts.bold, color: MUTED }));
    x += widths[index];
  });
  writer.y -= headerHeight;
}

function drawEvidenceTable(writer, table, category) {
  const columns = (table?.columns || []).filter((column) => column !== "Select");
  if (!columns.length) return;
  const widths = columns.map(() => CONTENT_WIDTH / columns.length);
  const rows = table.rows || [];
  const titleLines = table.title && table.title !== "Evidence" ? wrapText(table.title, writer.fonts.bold, 9.5, CONTENT_WIDTH) : [];
  const titleHeight = titleLines.length ? (titleLines.length * 12) + 6 : 0;
  let firstRowHeight = 20;
  if (rows.length) {
    const firstRowLines = columns.map((column, index) => wrapText(valueText(rows[0][column]), writer.fonts.regular, 7.4, widths[index] - 10));
    firstRowHeight = Math.max(18, (Math.max(...firstRowLines.map((lines) => lines.length)) * 9) + 8);
  }
  writer.ensure(titleHeight + 24 + Math.min(firstRowHeight, 54), category);
  drawTableHeader(writer, columns, widths, table.title, category);
  if (!rows.length) {
    writer.text("No evidence rows returned.", { x: MARGIN + 5, width: CONTENT_WIDTH - 10, size: 8, after: 8, category });
    return;
  }
  for (const row of rows) {
    const cellLines = columns.map((column, index) => wrapText(valueText(row[column]), writer.fonts.regular, 7.4, widths[index] - 10));
    let offset = 0;
    const total = Math.max(...cellLines.map((lines) => lines.length));
    while (offset < total) {
      const availableLines = Math.max(1, Math.floor((writer.y - 42) / 9));
      if (availableLines < 2) {
        writer.addPage(category);
        drawTableHeader(writer, columns, widths, table.title, category);
      }
      const lineCapacity = Math.max(1, Math.floor((writer.y - 42) / 9));
      const count = Math.min(total - offset, lineCapacity);
      const rowHeight = Math.max(18, (count * 9) + 8);
      let x = MARGIN;
      columns.forEach((column, index) => {
        const lines = cellLines[index].slice(offset, offset + count);
        lines.forEach((line, lineIndex) => writer.page.drawText(line, { x: x + 5, y: writer.y - (lineIndex * 9), size: 7.4, font: writer.fonts.regular, color: NAVY }));
        x += widths[index];
      });
      writer.page.drawLine({ start: { x: MARGIN, y: writer.y - rowHeight + 6 }, end: { x: PAGE_WIDTH - MARGIN, y: writer.y - rowHeight + 6 }, thickness: 0.5, color: BORDER });
      writer.y -= rowHeight;
      offset += count;
      if (offset < total) {
        writer.addPage(category);
        drawTableHeader(writer, columns, widths, table.title, category);
      }
    }
  }
  writer.y -= 7;
}

function drawCheck(writer, check, category) {
  const status = STATUS_LABELS[check.status] || clean(check.status || "Unknown");
  const severity = SEVERITY_LABELS[check.severity] || clean(check.severity || "Medium");
  const statusWidth = check.hideBadges ? 0 : writer.fonts.bold.widthOfTextAtSize(status, 7.4) + 14;
  const severityWidth = check.hideBadges ? 0 : writer.fonts.bold.widthOfTextAtSize(severity, 7.4) + 14;
  const badgesWidth = check.hideBadges ? 0 : statusWidth + severityWidth + 16;
  const titleWidth = CONTENT_WIDTH - badgesWidth - 18;
  const titleLines = wrapText(check.title || "Untitled Check", writer.fonts.bold, 11.2, titleWidth);
  const headerHeight = Math.max(28, (titleLines.length * 14) + 10);
  writer.ensure(headerHeight + 44, category);
  const top = writer.y + 8;
  writer.page.drawRectangle({ x: MARGIN, y: top - headerHeight + 1, width: CONTENT_WIDTH, height: headerHeight, color: WHITE, borderColor: BORDER, borderWidth: 0.7 });
  titleLines.forEach((line, index) => writer.page.drawText(line, {
    x: MARGIN + 9, y: top - 17 - (index * 14), size: 11.2, font: writer.fonts.bold, color: PINK
  }));
  if (!check.hideBadges) {
    const startX = PAGE_WIDTH - MARGIN - statusWidth - severityWidth - 7;
    drawPill(writer, status, startX, top - 19, statusTone(check.status));
    drawPill(writer, severity, startX + statusWidth + 7, top - 19, statusTone(check.severity === "high" ? "remediation-recommended" : "unknown"));
  }
  writer.y = top - headerHeight - 10;
  const tables = [...(check.evidenceTable ? [check.evidenceTable] : []), ...(check.evidenceTables || [])];
  for (const [label, value, critical] of detailRows(check, tables.length > 0)) drawDetailRow(writer, label, value, critical, category);
  for (const table of tables) drawEvidenceTable(writer, table, category);
  writer.y -= 6;
}

function summaryCounts(checks) {
  const count = (statuses) => checks.filter((check) => statuses.includes(check.status)).length;
  return [
    [checks.length, "Checks", BLUE_BG, MUTED],
    [count(["remediation-required", "remediation-recommended"]), "Remediation Recommended", RED_BG, RED],
    [count(["needs-review", "remediation-review-recommended"]), "Review Recommended", YELLOW_BG, YELLOW],
    [count(["manual", "informational"]), "Manual / Informational", BLUE_BG, MUTED]
  ];
}

function drawCover(writer, scan) {
  const page = writer.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  writer.page = page;
  writer.pages.push(page);
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 116, width: PAGE_WIDTH, height: 116, color: PINK });
  page.drawText("Check Point", { x: MARGIN, y: PAGE_HEIGHT - 59, size: 30, font: writer.fonts.bold, color: WHITE });
  page.drawText("Trusted Access Review", { x: MARGIN, y: PAGE_HEIGHT - 92, size: 30, font: writer.fonts.bold, color: WHITE });
  page.drawText("HARDENING ASSESSMENT REPORT", { x: MARGIN, y: PAGE_HEIGHT - 145, size: 10, font: writer.fonts.bold, color: MUTED });
  page.drawText(`Scanned: ${formatDate(scan.scannedAt)}`, { x: MARGIN, y: PAGE_HEIGHT - 166, size: 10, font: writer.fonts.regular, color: NAVY });
  page.drawText(`Management: ${clean(scan.managementObjectName || scan.baseUrl || "Unknown")}`, { x: MARGIN, y: PAGE_HEIGHT - 184, size: 10, font: writer.fonts.regular, color: NAVY });
  page.drawText(`Operator: ${clean(scan.user || "Unknown")}`, { x: MARGIN, y: PAGE_HEIGHT - 202, size: 10, font: writer.fonts.regular, color: NAVY });
  const cards = summaryCounts(scan.checks || []);
  const cardWidth = (CONTENT_WIDTH - 30) / 4;
  cards.forEach(([count, label, fill, ink], index) => {
    const x = MARGIN + (index * (cardWidth + 10));
    page.drawRectangle({ x, y: 292, width: cardWidth, height: 92, color: fill, borderColor: BORDER, borderWidth: 0.7 });
    page.drawText(String(count), { x: x + 13, y: 344, size: 25, font: writer.fonts.bold, color: ink });
    const lines = wrapText(label.toUpperCase(), writer.fonts.bold, 7.4, cardWidth - 26);
    lines.slice(0, 3).forEach((line, lineIndex) => page.drawText(line, { x: x + 13, y: 323 - (lineIndex * 10), size: 7.4, font: writer.fonts.bold, color: ink }));
  });
  page.drawText("Scope", { x: MARGIN, y: 252, size: 13, font: writer.fonts.bold, color: PINK });
  const scope = "This report summarizes the access and hardening checks returned by the Check Point Trusted Access Review application. Most findings are review-only. Any remediation requires explicit operator approval in the application.";
  wrapText(scope, writer.fonts.regular, 9.5, CONTENT_WIDTH).forEach((line, index) => page.drawText(line, { x: MARGIN, y: 232 - (index * 13), size: 9.5, font: writer.fonts.regular, color: NAVY }));
  page.drawText("Report Sections", { x: MARGIN, y: 170, size: 13, font: writer.fonts.bold, color: PINK });
  const categories = [...new Set((scan.checks || []).map((check) => clean(check.category || "Hardening Checks")))];
  categories.forEach((category, index) => page.drawText(`${index + 1}. ${category}`, { x: MARGIN + 8, y: 150 - (index * 16), size: 9.5, font: writer.fonts.regular, color: NAVY }));
}

export async function generateTrustedAccessReviewPdf(scan) {
  const doc = await PDFDocument.create();
  doc.setTitle("Check Point Trusted Access Review");
  doc.setSubject("Check Point hardening assessment report");
  doc.setCreator("Check Point Trusted Access Review");
  doc.setProducer("pdf-lib");
  doc.setCreationDate(new Date());
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold)
  };
  const writer = new ReportWriter(doc, fonts);
  drawCover(writer, scan);
  const groups = new Map();
  for (const check of scan.checks || []) {
    const category = clean(check.category || "Hardening Checks");
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(check);
  }
  for (const [category, checks] of groups) {
    writer.addPage(category);
    writer.text(category, { size: 19, bold: true, color: PINK, after: 10, category });
    for (const check of checks) drawCheck(writer, check, category);
  }
  writer.finish();
  return doc.save();
}
