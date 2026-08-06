import type { Diagram } from "#/types/diagram";

export type LintSeverity = "error" | "warning" | "info";

export interface LintIssue {
  id: string;
  severity: LintSeverity;
  message: string;
  fix?: { type: "addIndex" | "primaryKey"; tableId: string; columnId?: string };
}

function hasPrimary(table: Diagram["tables"][number]): boolean {
  return table.columns.some(
    (c) =>
      c.keyType === "primary" ||
      table.indexes.some((ix) => ix.type === "primary" && ix.columnIds.includes(c.id)),
  );
}

function isIndexed(table: Diagram["tables"][number], columnId: string): boolean {
  const col = table.columns.find((c) => c.id === columnId);
  if (!col) return false;
  if (col.keyType !== "none") return true;
  return table.indexes.some((ix) => ix.columnIds.includes(columnId));
}

function namingIssues(names: string[]): string | null {
  const snake = names.some((n) => /_/.test(n));
  const camel = names.some((n) => /[A-Z]/.test(n));
  if (snake && camel) return "names mix snake_case and camelCase; pick one convention.";
  return null;
}

export function lintDiagram(diagram: Diagram): LintIssue[] {
  const issues: LintIssue[] = [];
  const used = new Set<string>();

  const push = (issue: LintIssue) => {
    if (used.has(issue.id)) return;
    used.add(issue.id);
    issues.push(issue);
  };

  // table-level rules
  for (const table of diagram.tables) {
    if (!hasPrimary(table)) {
      push({
        id: `pk-${table.id}`,
        severity: "warning",
        message: `Table "${table.name}" has no primary key.`,
        fix: {
          type: "primaryKey",
          tableId: table.id,
          columnId: table.columns[0]?.id,
        },
      });
    }

    if (table.columns.length === 0) {
      push({
        id: `empty-${table.id}`,
        severity: "warning",
        message: `Table "${table.name}" has no columns.`,
      });
    }

    // duplicate column names
    const seen = new Map<string, string>();
    for (const c of table.columns) {
      const key = c.name.toLowerCase();
      if (!c.name) continue;
      const prior = seen.get(key);
      if (prior) {
        push({
          id: `dupcol-${table.id}-${key}`,
          severity: "error",
          message: `Column "${c.name}" appears more than once in table "${table.name}".`,
        });
      } else {
        seen.set(key, c.id);
      }
    }

    // unnamed / missing type columns
    for (const c of table.columns) {
      if (!c.type) {
        push({
          id: `notype-${c.id}`,
          severity: "warning",
          message: `Column "${c.name || "unnamed"}" in "${table.name}" has no type.`,
        });
      }
    }

    // column naming consistency
    const colNames = table.columns.map((c) => c.name).filter(Boolean);
    const colIssue = namingIssues(colNames);
    if (colIssue) {
      push({
        id: `colnaming-${table.id}`,
        severity: "info",
        message: `Columns in "${table.name}" ${colIssue}`,
      });
    }
  }

  const tableNames = diagram.tables.map((t) => t.name).filter(Boolean);
  const tableNaming = namingIssues(tableNames);
  if (tableNaming) {
    push({
      id: "tablenaming",
      severity: "info",
      message: `Table ${tableNaming}`,
    });
  }

  // relationship rules
  for (const rel of diagram.relationships) {
    const src = diagram.tables.find((t) => t.id === rel.sourceTableId);
    const tgt = diagram.tables.find((t) => t.id === rel.targetTableId);
    if (!src || !tgt) {
      push({
        id: `orphan-rel-${rel.id}`,
        severity: "error",
        message: "A relationship references a missing table.",
      });
      continue;
    }

    const col = src.columns.find((c) => c.id === rel.sourceColumnId);
    if (col && !isIndexed(src, col.id)) {
      push({
        id: `fkidx-${rel.id}`,
        severity: "info",
        message: `Foreign key "${src.name}.${col.name}" is not indexed; add an index for join performance.`,
        fix: { type: "addIndex", tableId: src.id, columnId: col.id },
      });
    }

    if (rel.cardinality === "many-to-many") {
      push({
        id: `m2m-${rel.id}`,
        severity: "warning",
        message: `Many-to-many relationship between "${src.name}" and "${tgt.name}" — consider a join table.`,
      });
    }
  }

  return issues;
}

export function severityOrder(severity: LintSeverity): number {
  return severity === "error" ? 0 : severity === "warning" ? 1 : 2;
}
