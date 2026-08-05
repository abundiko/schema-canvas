import type { Column, CompositeIndex, Diagram, TableEntity } from "#/types/diagram";
import { getDriver } from "#/lib/drivers";
import { formatDefault } from "#/lib/utils/defaults";

const PG_SERIAL: Record<string, string> = {
  smallint: "smallserial",
  int: "serial",
  integer: "serial",
  bigint: "bigserial",
};

function quote(diagram: Diagram, name: string): string {
  return getDriver(diagram.driver).quote.open + name + getDriver(diagram.driver).quote.close;
}

function quoteValue(v: string): string {
  return `'${v.replace(/'/g, "''")}'`;
}

function columnType(diagram: Diagram, col: Column): string {
  const { driver } = diagram;
  const isPg = driver === "postgresql";

  let name = col.type;
  if (isPg && col.autoIncrement && PG_SERIAL[name]) {
    name = PG_SERIAL[name];
  }

  let out = name.toUpperCase();

  if (col.type === "enum" && col.enumValues) {
    out = `ENUM(${col.enumValues.map(quoteValue).join(", ")})`;
  } else if (col.type === "set" && col.setValues) {
    out = `SET(${col.setValues.map(quoteValue).join(", ")})`;
  } else if (col.typeParams) {
    out += `(${col.typeParams})`;
  }

  if (col.isArray) out += "[]";
  if ((driver === "mysql" || driver === "mariadb") && col.unsigned) {
    out += " UNSIGNED";
  }
  if (driver === "sqlserver" && col.identity) {
    const seed = col.identity.seed ?? 1;
    const increment = col.identity.increment ?? 1;
    out += ` IDENTITY(${seed},${increment})`;
  }
  return out;
}

function columnKeywords(diagram: Diagram, col: Column): string[] {
  const { driver } = diagram;
  const parts: string[] = [];

  parts.push(col.nullable ? "NULL" : "NOT NULL");

  if (col.default) {
    parts.push(`DEFAULT ${formatDefault(col.default.raw, col.default.kind)}`);
  }

  if (driver === "mysql" || driver === "mariadb") {
    if (col.autoIncrement) parts.push("AUTO_INCREMENT");
  } else if (driver === "postgresql") {
    // serial types already imply auto-increment
  } else if (driver === "sqlserver") {
    // IDENTITY rendered inline with the type
  }

  if (col.keyType === "primary") parts.push("PRIMARY KEY");
  if (col.keyType === "unique") parts.push("UNIQUE");

  if ((driver === "mysql" || driver === "mariadb") && col.comment) {
    parts.push(`COMMENT ${quoteValue(col.comment)}`);
  }

  return parts;
}

function renderColumn(diagram: Diagram, col: Column): string {
  const segments = [quote(diagram, col.name), columnType(diagram, col)];
  const keywords = columnKeywords(diagram, col);
  segments.push(...keywords);
  return segments.join(" ");
}

function indexName(table: TableEntity, ix: CompositeIndex): string {
  const cols = ix.columnIds
    .map((id) => table.columns.find((c) => c.id === id)?.name ?? "col")
    .join("_");
  return `${table.name}_${cols}`;
}

function renderCompositeIndexes(
  diagram: Diagram,
  table: TableEntity,
): { inline: string[]; separate: string[] } {
  const { driver } = diagram;
  const inline: string[] = [];
  const separate: string[] = [];

  for (const ix of table.indexes) {
    const colNames = ix.columnIds
      .map((id) => quote(diagram, table.columns.find((c) => c.id === id)?.name ?? ""))
      .join(", ");
    const name = indexName(table, ix);

    if (ix.type === "primary") {
      inline.push(`PRIMARY KEY (${colNames})`);
    } else if (ix.type === "unique") {
      if (driver === "mysql" || driver === "mariadb") {
        inline.push(`UNIQUE KEY ${quote(diagram, name)} (${colNames})`);
      } else if (driver === "postgresql") {
        inline.push(`CONSTRAINT ${quote(diagram, name)} UNIQUE (${colNames})`);
      } else {
        inline.push(`CONSTRAINT ${quote(diagram, name)} UNIQUE (${colNames})`);
      }
    } else {
      // plain index
      if (driver === "mysql" || driver === "mariadb") {
        inline.push(`KEY ${quote(diagram, name)} (${colNames})`);
      } else if (driver === "postgresql") {
        separate.push(
          `CREATE INDEX ${quote(diagram, name)} ON ${quote(diagram, table.name)} (${colNames});`,
        );
      } else {
        separate.push(
          `CREATE INDEX ${quote(diagram, name)} ON ${quote(diagram, table.name)} (${colNames});`,
        );
      }
    }
  }

  return { inline, separate };
}

export function generateDdl(diagram: Diagram): string {
  const out: string[] = [];

  for (const table of diagram.tables) {
    const cols = [...table.columns].sort((a, b) => a.order - b.order);
    const lines = cols.map((c) => renderColumn(diagram, c));
    const { inline, separate } = renderCompositeIndexes(diagram, table);
    lines.push(...inline);

    out.push(
      `CREATE TABLE ${quote(diagram, table.name)}(${lines.length > 0 ? "\n    " : ""}${lines.join(
        ",\n    ",
      )}\n);`,
    );
    out.push(...separate);
  }

  // foreign keys
  for (const rel of diagram.relationships) {
    const src = diagram.tables.find((t) => t.id === rel.sourceTableId);
    const tgt = diagram.tables.find((t) => t.id === rel.targetTableId);
    if (!src || !tgt) continue;
    const srcCol = src.columns.find((c) => c.id === rel.sourceColumnId);
    const tgtCol = tgt.columns.find((c) => c.id === rel.targetColumnId);
    if (!srcCol || !tgtCol) continue;

    const constraintName = `${src.name}_${srcCol.name}_foreign`;
    out.push(
      `ALTER TABLE ${quote(diagram, src.name)} ADD CONSTRAINT ${quote(
        diagram,
        constraintName,
      )}\nFOREIGN KEY(${quote(diagram, srcCol.name)}) REFERENCES ${quote(
        diagram,
        tgt.name,
      )}(${quote(diagram, tgtCol.name)});`,
    );
  }

  return out.join("\n");
}
