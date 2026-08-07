import type {
  Column,
  CompositeIndex,
  Diagram,
  Driver,
  ReferentialAction,
  Relationship,
  TableEntity,
} from "#/types/diagram";
import { createId } from "#/lib/utils/ids";
import { classifyDefault } from "#/lib/utils/defaults";

export interface ParsedDbml {
  driver: Driver;
  tables: TableEntity[];
  relationships: Relationship[];
  warnings: string[];
}

interface RawRef {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  onDelete?: ReferentialAction;
  onUpdate?: ReferentialAction;
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ");
}

function splitTopLevel(lines: string[]): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const open = (trimmed.match(/\{/g) ?? []).length;
    const close = (trimmed.match(/\}/g) ?? []).length;
    depth += open - close;
    cur += `${line}\n`;
    if (depth <= 0) {
      out.push(cur);
      cur = "";
      depth = 0;
    }
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function parseSettings(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!raw) return map;
  for (const token of raw.split(",")) {
    const t = token.trim();
    if (!t) continue;
    const eq = t.indexOf(":");
    if (eq >= 0) {
      map.set(t.slice(0, eq).trim(), t.slice(eq + 1).trim());
    } else {
      map.set(t, "true");
    }
  }
  return map;
}

function parseTableBlock(block: string, tableId: string, warnings: string[]): TableEntity | null {
  const nameMatch = block.match(/^Table\s+([^\s{]+)\s*\{/);
  if (!nameMatch) return null;
  const tableName = nameMatch[1];

  const body = block.slice(block.indexOf("{") + 1, block.lastIndexOf("}"));
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const columns: Column[] = [];
  const indexes: CompositeIndex[] = [];
  let comment: string | undefined;

  let order = 0;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("indexes {")) {
      // consume until closing brace
      let j = i + 1;
      const inner: string[] = [];
      let depth = 1;
      while (j < lines.length && depth > 0) {
        const l = lines[j];
        depth += (l.match(/\{/g) ?? []).length - (l.match(/\}/g) ?? []).length;
        if (depth > 0) inner.push(l);
        j += 1;
      }
      i = j;
      for (const il of inner) {
        const m = il.match(/\(([^)]*)\)\s*(?:\[(.*?)\])?/);
        if (!m) continue;
        const colNames = m[1].split(",").map((c) => c.trim()).filter(Boolean);
        const settings = parseSettings(m[2] ?? "");
        const type =
          settings.has("pk") ? "primary" : settings.has("unique") ? "unique" : "index";
        if (colNames.length >= 2) {
          indexes.push({
            id: createId("idx"),
            columnIds: colNames.map(() => ""),
            type,
            order: indexes.length,
          });
          const idx = indexes[indexes.length - 1];
          idx.columnIds = colNames.map((name) => {
            const found = columns.find((c) => c.name === name);
            if (found) return found.id;
            warnings.push(
              `Index in table "${tableName}" references unknown column "${name}"; skipped.`,
            );
            return "";
          }).filter(Boolean);
          if (idx.columnIds.length < 2) {
            indexes.pop();
            continue;
          }
        } else if (colNames.length === 1) {
          warnings.push(
            `Single-column index "${colNames[0]}" in "${tableName}" is ignored (use column flags).`,
          );
        }
      }
      continue;
    }

    if (line.startsWith("Note:")) {
      comment = unquote(line.slice(line.indexOf(":") + 1).trim());
      i += 1;
      continue;
    }

    // column line
    const bracketStart = line.indexOf("[");
    const head = bracketStart >= 0 ? line.slice(0, bracketStart) : line;
    const settingsRaw = bracketStart >= 0 ? line.slice(bracketStart + 1, line.lastIndexOf("]")) : "";

    const headTokens = head.split(/\s+/).filter(Boolean);
    if (headTokens.length === 0) {
      warnings.push(`Unparsable column line in "${tableName}": ${line}`);
      i += 1;
      continue;
    }
    const name = headTokens[0];
    if (headTokens.length < 2) {
      warnings.push(`Column "${name}" in "${tableName}" has no type; defaulted to varchar`);
    }
    const type = headTokens.length >= 2 ? headTokens.slice(1).join(" ") : "varchar";
    const settings = parseSettings(settingsRaw);

    const col: Column = {
      id: createId("col"),
      name,
      type,
      nullable: !settings.has("not null") && !settings.has("pk"),
      keyType: settings.has("pk") ? "primary" : settings.has("unique") ? "unique" : "none",
      order,
    };
    if (settings.has("increment")) col.autoIncrement = true;
    if (settings.has("default")) {
      const raw = unquote(settings.get("default")!);
      const c = classifyDefault(raw);
      col.default = { raw: c.raw, kind: c.kind };
    }
    if (settings.has("note")) col.comment = unquote(settings.get("note")!);
    columns.push(col);
    order += 1;
    i += 1;
  }

  return {
    id: tableId,
    name: tableName,
    color: "#fda4af",
    position: { x: 100, y: 100 },
    comment,
    columns,
    indexes,
  };
}

function unquote(v: string): string {
  const t = v.trim();
  if (
    (t.startsWith("'") && t.endsWith("'")) ||
    (t.startsWith('"') && t.endsWith('"'))
  ) {
    return t.length >= 2 ? t.slice(1, -1) : t;
  }
  return t.replace(/^`(.*)`$/, "$1");
}

function parseRefLine(line: string): RawRef | null {
  const m = line.match(
    /Ref\s*:\s*([\w]+)\s*\.\s*([\w]+)\s*(>|<|<>)\s*([\w]+)\s*\.\s*([\w]+)\s*(?:\[(.*?)\])?/,
  );
  if (!m) return null;
  const [, st, sc, op, tt, tc, settingsRaw] = m;
  if (op === "<") return null; // reverse direction unsupported; normalize below
  const settings = parseSettings(settingsRaw ?? "");
  const ref: RawRef = {
    sourceTable: st,
    sourceColumn: sc,
    targetTable: tt,
    targetColumn: tc,
  };
  if (settings.has("delete")) ref.onDelete = settings.get("delete") as ReferentialAction;
  if (settings.has("update")) ref.onUpdate = settings.get("update") as ReferentialAction;
  return ref;
}

export function parseDbml(src: string): ParsedDbml {
  const warnings: string[] = [];
  const cleaned = stripComments(src);
  const blocks = splitTopLevel(cleaned.split("\n"));

  const tables: TableEntity[] = [];
  const rawRefs: RawRef[] = [];
  let projectDriver: string | null = null;

  for (const block of blocks) {
    const trimmed = block.trim();
    if (trimmed.startsWith("Project")) {
      const dbMatch = trimmed.match(/database_type\s*:\s*'([^']+)'/i);
      if (dbMatch) projectDriver = dbMatch[1];
      continue;
    }
    if (trimmed.startsWith("Table")) {
      const t = parseTableBlock(trimmed, createId("tbl"), warnings);
      if (t) tables.push(t);
      continue;
    }
    // Ref line or Ref { ... } block
    const refLines = trimmed
      .replace(/^Ref\s*\{/, "")
      .replace(/\}\s*$/, "")
      .split("\n");
    for (const rl of refLines) {
      const ref = parseRefLine(rl.trim());
      if (ref) rawRefs.push(ref);
    }
  }

  // detect driver
  let driver: Driver = "mysql";
  if (projectDriver) {
    const lower = projectDriver.toLowerCase();
    if (lower.includes("postgres")) driver = "postgresql";
    else if (lower.includes("mariadb")) driver = "mariadb";
    else if (lower.includes("mongo")) driver = "mongodb";
    else if (lower.includes("sql server") || lower.includes("mssql")) driver = "sqlserver";
    else driver = "mysql";
  } else {
    const allTypes = new Set(
      tables.flatMap((t) => t.columns.map((c) => c.type.toLowerCase())),
    );
    if (allTypes.has("jsonb") || allTypes.has("serial") || allTypes.has("uuid")) driver = "postgresql";
    else if (allTypes.has("uniqueidentifier")) driver = "sqlserver";
    else if (allTypes.has("objectid") || allTypes.has("object")) driver = "mongodb";
  }

  // resolve refs onto table/column ids
  const relationships: Relationship[] = [];
  for (const ref of rawRefs) {
    const src = tables.find((t) => t.name === ref.sourceTable);
    const tgt = tables.find((t) => t.name === ref.targetTable);
    if (!src) {
      warnings.push(`Ref references unknown table "${ref.sourceTable}"; skipped.`);
      continue;
    }
    if (!tgt) {
      warnings.push(`Ref references unknown table "${ref.targetTable}"; skipped.`);
      continue;
    }
    const sc = src.columns.find((c) => c.name === ref.sourceColumn);
    const tc = tgt.columns.find((c) => c.name === ref.targetColumn);
    if (!sc || !tc) {
      warnings.push(`Ref "${ref.sourceTable}.${ref.sourceColumn} > ..." references unknown column; skipped.`);
      continue;
    }
    relationships.push({
      id: createId("rel"),
      sourceTableId: src.id,
      sourceColumnId: sc.id,
      targetTableId: tgt.id,
      targetColumnId: tc.id,
      cardinality: "one-to-many",
      onDelete: ref.onDelete,
      onUpdate: ref.onUpdate,
    });
  }

  return { driver, tables, relationships, warnings };
}

export function dbmlToDiagram(src: string): Diagram {
  const parsed = parseDbml(src);
  const nowIso = new Date().toISOString();
  return {
    id: createId("diag"),
    name: "Imported diagram",
    driver: parsed.driver,
    tables: parsed.tables,
    relationships: parsed.relationships,
    groups: [],
    notes: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
