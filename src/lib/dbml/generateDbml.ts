import type { Column, Diagram, TableEntity } from "#/types/diagram";
import { quoteValue } from "#/lib/dbml/util";

const DBML_DRIVER: Record<string, string> = {
  mysql: "MySQL",
  mariadb: "MariaDB",
  postgresql: "PostgreSQL",
  sqlserver: "SQL Server",
  mongodb: "MongoDB",
};

function columnSettings(col: Column): string[] {
  const s: string[] = [];
  if (col.keyType === "primary") s.push("pk");
  if (col.keyType === "unique") s.push("unique");
  if (!col.nullable) s.push("not null");
  if (col.autoIncrement) s.push("increment");
  if (col.default) s.push(`default: ${quoteValue(col.default.raw)}`);
  if (col.comment) s.push(`note: '${col.comment.replace(/'/g, "\\'")}'`);
  return s;
}

function columnType(col: Column): string {
  let t = col.type.toLowerCase();
  if (col.typeParams) t += `(${col.typeParams})`;
  if (col.isArray) t += "[]";
  return t;
}

function renderTable(table: TableEntity): string {
  const lines: string[] = [];
  lines.push(`Table ${table.name} {`);

  const cols = [...table.columns].sort((a, b) => a.order - b.order);
  for (const c of cols) {
    const settings = columnSettings(c);
    const name = c.name || "unnamed";
    lines.push(`  ${name} ${columnType(c)}${settings.length > 0 ? ` [${settings.join(", ")}]` : ""}`);
  }

  if (table.indexes.length > 0) {
    lines.push("  indexes {");
    for (const ix of table.indexes) {
      const cols = ix.columnIds
        .map((id) => table.columns.find((c) => c.id === id)?.name ?? "")
        .filter(Boolean)
        .join(", ");
      const settings: string[] = [];
      if (ix.type === "unique") settings.push("unique");
      if (ix.type === "primary") settings.push("pk");
      lines.push(`    (${cols})${settings.length > 0 ? ` [${settings.join(", ")}]` : ""}`);
    }
    lines.push("  }");
  }

  if (table.comment) {
    lines.push(`  Note: '${table.comment.replace(/'/g, "\\'")}'`);
  }

  lines.push("}");
  return lines.join("\n");
}

export function generateDbml(diagram: Diagram): string {
  const out: string[] = [];

  out.push(`Project ${diagram.name.replace(/\s+/g, "_")} {`);
  out.push(`  database_type: '${DBML_DRIVER[diagram.driver] ?? "MySQL"}'`);
  if (diagram.description) {
    out.push(`  Note: '${diagram.description.replace(/'/g, "\\'")}'`);
  }
  out.push("}");
  out.push("");

  for (const table of diagram.tables) {
    out.push(renderTable(table));
    out.push("");
  }

  for (const rel of diagram.relationships) {
    const src = diagram.tables.find((t) => t.id === rel.sourceTableId);
    const tgt = diagram.tables.find((t) => t.id === rel.targetTableId);
    if (!src || !tgt) continue;
    const srcCol = src.columns.find((c) => c.id === rel.sourceColumnId);
    const tgtCol = tgt.columns.find((c) => c.id === rel.targetColumnId);
    if (!srcCol || !tgtCol) continue;

    const settings: string[] = [];
    if (rel.onDelete) settings.push(`delete: ${rel.onDelete}`);
    if (rel.onUpdate) settings.push(`update: ${rel.onUpdate}`);
    const suffix = settings.length > 0 ? ` [${settings.join(", ")}]` : "";
    out.push(`Ref: ${src.name}.${srcCol.name} > ${tgt.name}.${tgtCol.name}${suffix}`);
  }

  return out.join("\n");
}
