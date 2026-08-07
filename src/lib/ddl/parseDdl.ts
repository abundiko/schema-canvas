import type {
  Column,
  CompositeIndex,
  Driver,
  Relationship,
  TableEntity,
} from "#/types/diagram";
import { createId } from "#/lib/utils/ids";
import { classifyDefault } from "#/lib/utils/defaults";
import { getDriver } from "#/lib/drivers";
import { splitStatements, tokenize, kw, type Token } from "./tokenize";

export interface ParsedDdl {
  driver: Driver;
  tables: TableEntity[];
  relationships: Relationship[];
  warnings: string[];
}

export interface ParseOptions {
  driver?: Driver;
}

interface RawConstraint {
  type: "primary" | "unique" | "index";
  name?: string;
  columnNames: string[];
}

interface RawRelationship {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
}

const CONSTRAINT_STARTERS = new Set([
  "constraint",
  "primary",
  "unique",
  "key",
  "index",
  "foreign",
  "check",
  "fulltext",
  "spatial",
]);

const TYPE_ALIASES: Record<string, string> = {
  "timestamp with time zone": "timestamptz",
  "timestamp without time zone": "timestamp",
  "time with time zone": "timetz",
  "time without time zone": "time",
  "character varying": "character varying",
  "double precision": "double precision",
};

function normalizeType(raw: string): string {
  return TYPE_ALIASES[raw.toLowerCase()] ?? raw.toLowerCase();
}

export function detectDriver(sql: string): Driver {
  const hasBrackets = /\[[^\]]+\]/.test(sql);
  const hasBackticks = /`[^`]+`/.test(sql);
  if (/\bIDENTITY\s*\(/i.test(sql)) return "sqlserver";
  if (hasBackticks && /\bAUTO_INCREMENT\b/i.test(sql)) return "mysql";
  if (/\b(SERIAL|BIGSERIAL|SMALLSERIAL)\b/i.test(sql)) return "postgresql";
  if (/"[A-Za-z_][A-Za-z0-9_]*"/.test(sql)) return "postgresql";
  if (hasBrackets) return "sqlserver";
  if (hasBackticks) return "mysql";
  return "mysql";
}

function reconstruct(tokens: Token[]): string {
  let out = "";
  for (const t of tokens) {
    let piece: string;
    if (t.type === "string") piece = `'${t.value}'`;
    else if (t.type === "ident") piece = t.value;
    else piece = t.value;
    if (out === "") out = piece;
    else if (piece === "(" || piece === ")" || piece === "," || piece === ".") {
      out += piece;
    } else if (out.endsWith("(") || out.endsWith(".")) {
      out += piece;
    } else {
      out += ` ${piece}`;
    }
  }
  return out.trim();
}

/** Collect tokens until a top-level comma or closing paren; returns [consumed, stopToken] */
function collectUntilSep(
  tokens: Token[],
  start: number,
  stopAtComma = true,
): { tokens: Token[]; next: number; stop: "comma" | "paren" | "end" } {
  const collected: Token[] = [];
  let depth = 0;
  let i = start;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === "punct" && t.value === "(") {
      depth += 1;
      collected.push(t);
      i += 1;
      continue;
    }
    if (t.type === "punct" && t.value === ")") {
      if (depth === 0) return { tokens: collected, next: i, stop: "paren" };
      depth -= 1;
      collected.push(t);
      i += 1;
      continue;
    }
    if (t.type === "punct" && t.value === "," && depth === 0 && stopAtComma) {
      return { tokens: collected, next: i, stop: "comma" };
    }
    collected.push(t);
    i += 1;
  }
  return { tokens: collected, next: i, stop: "end" };
}

interface ParsedColumnItem {
  column: Column;
  inlineRef?: { targetTable: string; targetColumn: string };
  constraint?: RawConstraint;
}

function parseTypeParams(tokens: Token[], start: number): { typeParams?: string; next: number } {
  const t = tokens[start];
  if (t?.type === "punct" && t.value === "(") {
    const { tokens: inner, next } = collectUntilSep(tokens, start + 1, false);
    if (next > start + 1 || inner.length > 0) {
      const typeParams = reconstruct(inner);
      // skip the closing paren
      let n = next;
      if (tokens[n]?.type === "punct" && tokens[n].value === ")") n += 1;
      return { typeParams: typeParams === "()" ? undefined : typeParams, next: n };
    }
  }
  return { next: start };
}

function parseColumn(
  tokens: Token[],
  start: number,
  driver: Driver,
  tableName: string,
  warnings: string[],
): { item: ParsedColumnItem; next: number } {
  const nameTok = tokens[start];
  if (!nameTok || (nameTok.type !== "word" && nameTok.type !== "ident")) {
    throw new Error(`Expected column name at token ${start}`);
  }
  const name = nameTok.value;
  let i = start + 1;

  // read type (possibly multi-word: double precision, character varying)
  let typeParts: string[] = [];
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === "punct" && (t.value === "(" || t.value === "," || t.value === ")")) break;
    if (t.type !== "word" && t.type !== "ident") break;
    const word = kw(t);
    if (
      word === "not" ||
      word === "null" ||
      word === "default" ||
      word === "primary" ||
      word === "unique" ||
      word === "auto_increment" ||
      word === "identity" ||
      word === "unsigned" ||
      word === "references" ||
      word === "comment" ||
      word === "collate" ||
      word === "character" ||
      word === "generated" ||
      word === "as" ||
      word === "stored" ||
      word === "virtual" ||
      word === "on"
    ) {
      break;
    }
    typeParts.push(t.value);
    i += 1;
    // stop after a single-word type unless it's a known compound
    if (typeParts.length === 1) {
      const lower = typeParts[0].toLowerCase();
      if (lower !== "double" && lower !== "character") break;
    }
  }
  if (typeParts.length === 0) {
    warnings.push(`Column "${name}" in "${tableName}" has no type; defaulted to varchar`);
    typeParts = ["varchar"];
  }
  const typeRaw = typeParts.join(" ");
  const typeLower = normalizeType(typeRaw);

  // array suffix [] (postgres)
  let isArray = false;
  if (tokens[i]?.type === "punct" && tokens[i].value === "[") {
    isArray = true;
    i += 2; // skip [ and ]
  }

  // type params
  let typeParams: string | undefined;
  {
    const r = parseTypeParams(tokens, i);
    typeParams = r.typeParams;
    i = r.next;
  }

  // validate type
  const driverCfg = getDriver(driver);
  if (!driverCfg.typeMap.has(typeLower)) {
    warnings.push(
      `Unrecognized type "${typeRaw}" for column "${name}" in "${tableName}" (${driver})`,
    );
  }

  const column: Column = {
    id: createId("col"),
    name,
    type: typeLower,
    typeParams,
    isArray,
    nullable: true,
    keyType: "none",
    order: 0,
  };

  let inlineRef: ParsedColumnItem["inlineRef"];
  let constraint: RawConstraint | undefined;

  // parse attributes until top-level comma / paren / end
  let cursor = i;
  let depth = 0;
  while (cursor < tokens.length) {
    const t = tokens[cursor];
    if (t.type === "punct" && t.value === "(") depth += 1;
    if (t.type === "punct" && t.value === ")") {
      if (depth === 0) break;
      depth -= 1;
    }
    if (t.type === "punct" && t.value === "," && depth === 0) break;
    const w = kw(t);
    if (t.type === "word") {
      if (w === "not") {
        column.nullable = false;
        cursor += 1;
        continue;
      }
      if (w === "null") {
        column.nullable = true;
        cursor += 1;
        continue;
      }
      if (w === "primary") {
        column.keyType = "primary";
        cursor += 2; // skip PRIMARY KEY
        continue;
      }
      if (w === "unique") {
        column.keyType = "unique";
        cursor += 1;
        continue;
      }
      if (w === "key" || w === "index") {
        column.keyType = "index";
        cursor += 1;
        continue;
      }
      if (w === "auto_increment") {
        column.autoIncrement = true;
        cursor += 1;
        continue;
      }
      if (w === "unsigned") {
        column.unsigned = true;
        cursor += 1;
        continue;
      }
      if (w === "default") {
        const { tokens: defTokens, next } = collectUntilSep(tokens, cursor + 1);
        const raw = reconstruct(defTokens);
        const classified = classifyDefault(raw);
        column.default = { raw: classified.raw, kind: classified.kind };
        cursor = next;
        continue;
      }
      if (w === "identity") {
        column.identity = { seed: 1, increment: 1 };
        column.autoIncrement = true;
        let n = cursor + 1;
        if (tokens[n]?.type === "punct" && tokens[n].value === "(") {
          const { tokens: inner, next } = collectUntilSep(tokens, n + 1, false);
          const nums = inner.filter((x) => x.type === "number").map((x) => parseInt(x.value, 10));
          if (nums.length >= 1) column.identity = { seed: nums[0], increment: nums[1] ?? 1 };
          n = next + (tokens[next]?.value === ")" ? 1 : 0);
        }
        cursor = n;
        continue;
      }
      if (w === "references") {
        const { tokens: refTokens, next } = collectUntilSep(tokens, cursor + 1);
        const parts = refTokens.filter((x) => x.type === "word" || x.type === "ident");
        if (parts.length >= 1) {
          inlineRef = {
            targetTable: parts[0].value,
            targetColumn: parts[1]?.value ?? "id",
          };
        }
        cursor = next;
        continue;
      }
      if (w === "comment") {
        const nextTok = tokens[cursor + 1];
        if (nextTok?.type === "string" || nextTok?.type === "ident") {
          column.comment = nextTok.value;
          cursor += 2;
          continue;
        }
        cursor += 1;
        continue;
      }
      if (w === "collate" || w === "character" || w === "charset") {
        // skip this and the following value word
        cursor += 2;
        continue;
      }
      if (w === "generated" || w === "as" || w === "stored" || w === "virtual") {
        cursor += 1;
        continue;
      }
    }
    // unrecognized token — skip it
    cursor += 1;
  }

  // enum/set values from typeParams
  if (typeLower === "enum" || typeLower === "set") {
    const values = (typeParams ?? "")
      .split(",")
      .map((s) => s.trim().replace(/^'/, "").replace(/'$/, ""))
      .filter((s) => s.length > 0);
    if (typeLower === "enum") column.enumValues = values;
    else column.setValues = values;
    column.typeParams = undefined;
  }

  // inline PRIMARY KEY / UNIQUE on a single column → also emit as a 1-col constraint? No: single-col keys live on Column
  if (column.keyType === "primary") {
    constraint = { type: "primary", columnNames: [name] };
  }
  if (column.keyType === "unique") {
    constraint = { type: "unique", columnNames: [name] };
  }
  if (column.keyType === "index") {
    constraint = { type: "index", columnNames: [name] };
  }

  return { item: { column, inlineRef, constraint }, next: cursor };
}

export function parseDdl(sql: string, options: ParseOptions = {}): ParsedDdl {
  const tokens = tokenize(sql);
  const statements = splitStatements(tokens);
  const driver: Driver = options.driver ?? detectDriver(sql);
  const warnings: string[] = [];

  const tables: TableEntity[] = [];
  const rawConstraints = new Map<string, RawConstraint[]>();
  const rawRelationships: RawRelationship[] = [];

  for (const stmt of statements) {
    const head = kw(stmt[0]);
    if (head === "create" && kw(stmt[1]) === "table") {
      let i = 2;
      if (kw(stmt[i]) === "if" && kw(stmt[i + 1]) === "not" && kw(stmt[i + 2]) === "exists") {
        i += 3;
      }
      const nameTok = stmt[i];
      if (!nameTok || (nameTok.type !== "word" && nameTok.type !== "ident")) {
        warnings.push("Could not parse table name");
        continue;
      }
      const tableName = nameTok.value;
      i += 1;

      // CREATE TABLE ... AS SELECT → skip
      if (kw(stmt[i]) === "as") continue;

      // optional LIKE/USING etc.
      while (i < stmt.length && !(stmt[i].type === "punct" && stmt[i].value === "(")) {
        i += 1;
      }
      if (stmt[i]?.type === "punct" && stmt[i].value === "(") i += 1;

      const table: TableEntity = {
        id: createId("tbl"),
        name: tableName,
        color: "#fda4af",
        position: { x: 0, y: 0 },
        columns: [],
        indexes: [],
      };
      const constraints: RawConstraint[] = [];

      while (i < stmt.length) {
        const t = stmt[i];
        if (t.type === "punct" && t.value === ")") break;
        if (t.type === "punct" && t.value === ",") {
          i += 1;
          continue;
        }
        const word = kw(t);
        if (t.type === "word" && CONSTRAINT_STARTERS.has(word)) {
          // parse a table-level constraint
          i = parseTableConstraint(stmt, i, tableName, constraints, rawRelationships, warnings);
        } else {
          try {
            const { item, next } = parseColumn(stmt, i, driver, tableName, warnings);
            if (item.column) {
              item.column.order = table.columns.length;
              table.columns.push(item.column);
              if (item.inlineRef) {
                rawRelationships.push({
                  sourceTable: tableName,
                  sourceColumn: item.column.name,
                  targetTable: item.inlineRef.targetTable,
                  targetColumn: item.inlineRef.targetColumn,
                });
              }
              if (item.constraint) constraints.push(item.constraint);
            }
            i = next;
          } catch (e) {
            warnings.push(
              `Failed to parse column in "${tableName}": ${e instanceof Error ? e.message : String(e)}`,
            );
            // skip to next top-level separator
            const { next } = collectUntilSep(stmt, i);
            i = next;
          }
        }
        if (i < stmt.length && stmt[i].type === "punct" && stmt[i].value === ")") break;
      }

      tables.push(table);
      rawConstraints.set(tableName, constraints);
      continue;
    }

    if (head === "alter" && kw(stmt[1]) === "table") {
      // ALTER TABLE name ADD [CONSTRAINT [name]] FOREIGN KEY (cols) REFERENCES tbl (cols)
      let i = 2;
      const nameTok = stmt[i];
      if (!nameTok || (nameTok.type !== "word" && nameTok.type !== "ident")) continue;
      const tableName = nameTok.value;
      i += 1;
      while (i < stmt.length) {
        const w = kw(stmt[i]);
        if (w === "add") {
          i += 1;
          if (kw(stmt[i]) === "constraint") {
            i += 1;
            // optional constraint name
            if (
              stmt[i] &&
              (stmt[i].type === "word" || stmt[i].type === "ident") &&
              kw(stmt[i]) !== "foreign"
            ) {
              i += 1;
            }
          }
          if (kw(stmt[i]) === "foreign" && kw(stmt[i + 1]) === "key") {
            i += 2;
            if (stmt[i]?.type === "punct" && stmt[i].value === "(") {
              const { tokens: cols, next } = collectUntilSep(stmt, i + 1);
              const colNames = cols.filter((x) => x.type === "word" || x.type === "ident").map((x) => x.value);
              i = next + (stmt[next]?.value === ")" ? 1 : 0);
              if (kw(stmt[i]) === "references") {
                const { tokens: refTokens, next: next2 } = collectUntilSep(stmt, i + 1);
                const parts = refTokens.filter((x) => x.type === "word" || x.type === "ident");
                i = next2 + (stmt[next2]?.value === ")" ? 1 : 0);
                const targetTable = parts[0]?.value;
                const targetCols = parts.slice(1).map((x) => x.value);
                if (targetTable) {
                  for (let c = 0; c < colNames.length; c++) {
                    rawRelationships.push({
                      sourceTable: tableName,
                      sourceColumn: colNames[c],
                      targetTable,
                      targetColumn: targetCols[c] ?? "id",
                    });
                  }
                }
              }
            }
          }
        }
        i += 1;
      }
      continue;
    }
  }

  // assemble: resolve constraints + relationships
  for (const table of tables) {
    const constraints = rawConstraints.get(table.name) ?? [];
    const colMap = new Map(table.columns.map((c) => [c.name.toLowerCase(), c.id]));
    for (const c of constraints) {
      const ids = c.columnNames
        .map((name) => colMap.get(name.toLowerCase()))
        .filter((id): id is string => !!id);
      if (ids.length !== c.columnNames.length) {
        warnings.push(
          `Composite ${c.type} index on "${table.name}" references unknown columns; skipped`,
        );
        continue;
      }
      // single-column keys live on the Column itself
      if (ids.length === 1) {
        const col = table.columns.find((x) => x.id === ids[0]);
        if (col && col.keyType === "none") col.keyType = c.type;
        continue;
      }
      const index: CompositeIndex = {
        id: createId("idx"),
        columnIds: ids,
        type: c.type,
        order: table.indexes.length,
      };
      const dup = table.indexes.some(
        (ix) =>
          ix.type === c.type &&
          ix.columnIds.length === ids.length &&
          ix.columnIds.every((id, idx) => id === ids[idx]),
      );
      if (!dup) table.indexes.push(index);
    }
    // sort columns by order
    table.columns.sort((a, b) => a.order - b.order);
  }

  const relationships: Relationship[] = [];
  const tableByName = new Map(tables.map((t) => [t.name.toLowerCase(), t]));
  for (const r of rawRelationships) {
    const src = tableByName.get(r.sourceTable.toLowerCase());
    const tgt = tableByName.get(r.targetTable.toLowerCase());
    if (!src) {
      warnings.push(`Relationship references unknown source table "${r.sourceTable}"; skipped`);
      continue;
    }
    if (!tgt) {
      warnings.push(`Relationship references unknown target table "${r.targetTable}"; skipped`);
      continue;
    }
    const srcCol = src.columns.find((c) => c.name.toLowerCase() === r.sourceColumn.toLowerCase());
    const tgtCol = tgt.columns.find((c) => c.name.toLowerCase() === r.targetColumn.toLowerCase());
    if (!srcCol || !tgtCol) {
      warnings.push(
        `Relationship ${r.sourceTable}.${r.sourceColumn} → ${r.targetTable}.${r.targetColumn} references unknown column; skipped`,
      );
      continue;
    }
    relationships.push({
      id: createId("rel"),
      sourceTableId: src.id,
      sourceColumnId: srcCol.id,
      targetTableId: tgt.id,
      targetColumnId: tgtCol.id,
      cardinality: "one-to-many",
    });
  }

  return { driver, tables, relationships, warnings };
}

function parseTableConstraint(
  stmt: Token[],
  start: number,
  tableName: string,
  constraints: RawConstraint[],
  rawRelationships: RawRelationship[],
  warnings: string[],
): number {
  let i = start;
  const first = kw(stmt[i]);
  if (first === "constraint") {
    i += 1;
    if (
      stmt[i] &&
      (stmt[i].type === "word" || stmt[i].type === "ident") &&
      !["primary", "unique", "foreign", "key", "index", "check"].includes(kw(stmt[i]))
    ) {
      i += 1; // constraint name
    }
  }
  const kind = kw(stmt[i]);

  if (kind === "primary" || kind === "unique") {
    let type: "primary" | "unique" = kind === "primary" ? "primary" : "unique";
    i += 1;
    if (kw(stmt[i]) === "key" || kw(stmt[i]) === "index") i += 1;
    // optional name
    let name: string | undefined;
    if (
      stmt[i] &&
      (stmt[i].type === "word" || stmt[i].type === "ident") &&
      !(stmt[i].type === "punct" && stmt[i].value === "(")
    ) {
      name = stmt[i].value;
      i += 1;
    }
    if (stmt[i]?.type === "punct" && stmt[i].value === "(") {
      const { tokens: cols, next } = collectUntilSep(stmt, i + 1);
      const colNames = cols.filter((x) => x.type === "word" || x.type === "ident").map((x) => x.value);
      if (colNames.length >= 1) {
        constraints.push({ type, name, columnNames: colNames });
      }
      i = next + (stmt[next]?.value === ")" ? 1 : 0);
    }
    return i;
  }

  if (kind === "key" || kind === "index" || kind === "fulltext" || kind === "spatial") {
    i += 1;
    if (kw(stmt[i]) === "key" || kw(stmt[i]) === "index") i += 1;
    let name: string | undefined;
    if (
      stmt[i] &&
      (stmt[i].type === "word" || stmt[i].type === "ident") &&
      !(stmt[i].type === "punct" && stmt[i].value === "(")
    ) {
      name = stmt[i].value;
      i += 1;
    }
    if (stmt[i]?.type === "punct" && stmt[i].value === "(") {
      const { tokens: cols, next } = collectUntilSep(stmt, i + 1);
      const colNames = cols.filter((x) => x.type === "word" || x.type === "ident").map((x) => x.value);
      if (colNames.length >= 1) {
        constraints.push({ type: "index", name, columnNames: colNames });
      }
      i = next + (stmt[next]?.value === ")" ? 1 : 0);
    }
    return i;
  }

  if (kind === "foreign") {
    i += 1;
    if (kw(stmt[i]) === "key") i += 1;
    // optional constraint name
    if (
      stmt[i] &&
      (stmt[i].type === "word" || stmt[i].type === "ident") &&
      !(stmt[i].type === "punct" && stmt[i].value === "(")
    ) {
      i += 1;
    }
    if (stmt[i]?.type === "punct" && stmt[i].value === "(") {
      const { tokens: cols, next } = collectUntilSep(stmt, i + 1);
      const colNames = cols.filter((x) => x.type === "word" || x.type === "ident").map((x) => x.value);
      i = next + (stmt[next]?.value === ")" ? 1 : 0);
      if (kw(stmt[i]) === "references") {
        const { tokens: refTokens, next: next2 } = collectUntilSep(stmt, i + 1);
        const parts = refTokens.filter((x) => x.type === "word" || x.type === "ident");
        i = next2 + (stmt[next2]?.value === ")" ? 1 : 0);
        const targetTable = parts[0]?.value;
        const targetCols = parts.slice(1).map((x) => x.value);
        if (targetTable) {
          for (let c = 0; c < colNames.length; c++) {
            rawRelationships.push({
              sourceTable: tableName,
              sourceColumn: colNames[c],
              targetTable,
              targetColumn: targetCols[c] ?? "id",
            });
          }
        }
      }
    }
    return i;
  }

  if (kind === "check") {
    // skip to matching close paren of CHECK(...)
    let depth = 0;
    while (i < stmt.length) {
      const t = stmt[i];
      if (t.type === "punct" && t.value === "(") depth += 1;
      if (t.type === "punct" && t.value === ")") {
        depth -= 1;
        if (depth === 0) return i + 1;
      }
      i += 1;
    }
    return i;
  }

  // unknown constraint starter: skip one token
  warnings.push(`Unsupported constraint "${first}" on "${tableName}" skipped`);
  return i + 1;
}
