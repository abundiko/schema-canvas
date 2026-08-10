import type { Diagram } from "#/types/diagram";
import { generateDdl, type DdlOptions } from "#/lib/ddl/generateDdl";
import { generateDbml } from "#/lib/dbml/generateDbml";
import { generateTsTypes } from "./exportTs";
import { generateMongoJson } from "./exportMongo";
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

export function exportSql(diagram: Diagram, options?: DdlOptions): void {
  const sql = generateDdl(diagram, options);
  download(new Blob([sql], { type: "text/plain;charset=utf-8" }), `${diagram.name}.sql`);
}

export function exportTs(diagram: Diagram): void {
  const ts = generateTsTypes(diagram);
  download(new Blob([ts], { type: "text/plain;charset=utf-8" }), `${diagram.name}.types.ts`);
}

export function exportMongoSchema(diagram: Diagram): void {
  const json = generateMongoJson(diagram);
  download(new Blob([json], { type: "application/json;charset=utf-8" }), `${diagram.name}.mongodb.json`);
}

export function exportDbml(diagram: Diagram): void {
  const dbml = generateDbml(diagram);
  download(new Blob([dbml], { type: "text/plain;charset=utf-8" }), `${diagram.name}.dbml`);
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
  throw new Error("Laravel migrations export is not available in this build.");
}
