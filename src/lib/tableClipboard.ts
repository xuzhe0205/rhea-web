export function normalizeCellText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function extractTableRows(table: HTMLTableElement): string[][] {
  const rows = Array.from(table.querySelectorAll("tr"));

  return rows.map((row) =>
    Array.from(row.querySelectorAll("th, td")).map((cell) =>
      normalizeCellText(cell.textContent || ""),
    ),
  );
}

export function extractTableToTSV(table: HTMLTableElement): string {
  return extractTableRows(table)
    .map((row) => row.join("\t"))
    .join("\n");
}

export function extractTableToHTML(table: HTMLTableElement): string {
  return table.outerHTML;
}

export async function copyTableElement(table: HTMLTableElement): Promise<void> {
  const tsv = extractTableToTSV(table);
  const html = extractTableToHTML(table);

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": new Blob([tsv], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      }),
    ]);
  } catch {
    await navigator.clipboard.writeText(tsv);
  }
}
