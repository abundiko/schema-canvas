import { createServerFn } from "@tanstack/react-start";

import type { Diagram } from "#/types/diagram";

export interface ReviewSuggestion {
  id: string;
  severity: "info" | "warning" | "error";
  message: string;
  fix?: { type: "addIndex" | "primaryKey"; tableId: string; columnId?: string };
}

export const reviewSchema = createServerFn({ method: "POST" })
  .validator((diagram: Diagram) => diagram)
  .handler(async ({ data }) => {
    await new Promise((r) => setTimeout(r, 300));
    const suggestions: ReviewSuggestion[] = [];

    for (const table of data.tables) {
      const hasPrimary = table.columns.some(
        (c) =>
          c.keyType === "primary" ||
          table.indexes.some(
            (ix) => ix.type === "primary" && ix.columnIds.includes(c.id),
          ),
      );
      if (!hasPrimary) {
        suggestions.push({
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
    }

    for (const rel of data.relationships) {
      const src = data.tables.find((t) => t.id === rel.sourceTableId);
      if (!src) continue;
      const col = src.columns.find((c) => c.id === rel.sourceColumnId);
      if (!col) continue;
      const indexed =
        col.keyType !== "none" ||
        src.indexes.some((ix) => ix.columnIds.includes(col.id));
      if (!indexed) {
        suggestions.push({
          id: `fk-${rel.id}`,
          severity: "info",
          message: `Foreign key "${src.name}.${col.name}" is not indexed; add an index for join performance.`,
          fix: { type: "addIndex", tableId: src.id, columnId: col.id },
        });
      }
    }

    const names = data.tables.map((t) => t.name);
    const hasSnake = names.some((n) => /_/.test(n));
    const hasCamel = names.some((n) => /[A-Z]/.test(n));
    if (hasSnake && hasCamel) {
      suggestions.push({
        id: "naming",
        severity: "info",
        message: "Table names mix snake_case and camelCase; pick one convention.",
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        id: "ok",
        severity: "info",
        message: "No issues found. Schema looks good!",
      });
    }
    return suggestions;
  });
