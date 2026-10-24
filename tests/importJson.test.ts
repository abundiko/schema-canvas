import { describe, expect, it } from "vitest";

import { parseDiagramJson } from "#/lib/export/importJson";
import { TABLE_SWATCHES } from "#/lib/utils/palettes";

function exportedDiagram() {
  return {
    id: "diag_1",
    name: "Shop",
    description: "A small shop schema",
    driver: "postgresql",
    tables: [
      {
        id: "tbl_users",
        name: "users",
        color: "#60a5fa",
        position: { x: 10, y: 20 },
        columns: [
          {
            id: "col_id",
            name: "id",
            type: "serial",
            nullable: false,
            keyType: "primary",
            order: 0,
          },
        ],
        indexes: [],
      },
      {
        id: "tbl_orders",
        name: "orders",
        color: "#f87171",
        position: { x: 300, y: 20 },
        columns: [
          {
            id: "col_order_id",
            name: "id",
            type: "serial",
            nullable: false,
            keyType: "primary",
            order: 0,
          },
          {
            id: "col_user_id",
            name: "user_id",
            type: "int",
            nullable: true,
            keyType: "none",
            order: 1,
          },
        ],
        indexes: [],
      },
    ],
    relationships: [
      {
        id: "rel_1",
        sourceTableId: "tbl_orders",
        sourceColumnId: "col_user_id",
        targetTableId: "tbl_users",
        targetColumnId: "col_id",
        cardinality: "one-to-many",
        onDelete: "cascade",
      },
    ],
    groups: [],
    notes: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  };
}

describe("JSON diagram import", () => {
  it("round-trips a full diagram export", () => {
    const diagram = parseDiagramJson(JSON.stringify(exportedDiagram()));
    expect(diagram.name).toBe("Shop");
    expect(diagram.driver).toBe("postgresql");
    expect(diagram.tables.map((t) => t.name)).toEqual(["users", "orders"]);
    expect(diagram.tables.map((t) => t.color)).toEqual(["#60a5fa", "#f87171"]);
    expect(diagram.relationships).toHaveLength(1);
    expect(diagram.relationships[0].onDelete).toBe("cascade");
    expect(diagram.description).toBe("A small shop schema");
  });

  it("fills missing optional collections and defaults", () => {
    const diagram = parseDiagramJson(
      JSON.stringify({
        name: "Bare",
        tables: [
          {
            name: "t",
            columns: [{ name: "id", type: "int" }],
          },
        ],
      }),
    );
    expect(diagram.id).toBeTruthy();
    expect(diagram.driver).toBe("mysql");
    expect(diagram.relationships).toEqual([]);
    expect(diagram.groups).toEqual([]);
    expect(diagram.notes).toEqual([]);
    expect(diagram.tables[0].color).toBeTruthy();
    expect(diagram.tables[0].columns[0].keyType).toBe("none");
  });

  it("randomizes a uniform imported color", () => {
    const raw = exportedDiagram();
    raw.tables.forEach((table) => {
      table.color = "#f87171";
    });
    const diagram = parseDiagramJson(JSON.stringify(raw));
    const colors = diagram.tables.map((t) => t.color);
    expect(new Set(colors).size).toBeGreaterThan(1);
    expect(
      colors.every((c) => (TABLE_SWATCHES as readonly string[]).includes(c)),
    ).toBe(true);
  });

  it("drops relationships that point at missing columns", () => {
    const raw = exportedDiagram();
    raw.relationships[0].sourceColumnId = "col_missing";
    const diagram = parseDiagramJson(JSON.stringify(raw));
    expect(diagram.relationships).toEqual([]);
  });

  it("rejects invalid JSON and non-diagram payloads", () => {
    expect(() => parseDiagramJson("{ nope")).toThrow(/Invalid JSON/);
    expect(() => parseDiagramJson("[]")).toThrow(/diagram object/);
    expect(() => parseDiagramJson('{"name":"x"}')).toThrow(/tables/);
  });
});
