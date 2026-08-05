import type { Diagram } from "#/types/diagram";
import { generateDdl } from "#/lib/ddl/generateDdl";
import { exportJson } from "./exportJson";
import { getExportRoot, exportDiagramPng } from "./exportImage";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportSql(diagram: Diagram): void {
  const sql = generateDdl(diagram);
  download(new Blob([sql], { type: "text/plain;charset=utf-8" }), `${diagram.name}.sql`);
}

export async function exportImage(diagram: Diagram): Promise<void> {
  const root = getExportRoot();
  if (!root) return;
  await exportDiagramPng(root, `${diagram.name}.png`);
}

export function exportDiagramJson(diagram: Diagram): void {
  exportJson(diagram);
}

export function exportLaravelMigrations(_diagram: Diagram): void {
  // stretch goal — not implemented in v1
}
