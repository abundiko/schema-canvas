import { describe, expect, it } from "vitest";
import { generateDdl, generateTableDdl } from "#/lib/ddl/generateDdl";
import { generateDbml } from "#/lib/dbml/generateDbml";
import { parseDbml } from "#/lib/dbml/parseDbml";
import { lintDiagram, severityOrder } from "#/lib/lint/lint";
import { layoutDiagram } from "#/lib/layout/autoLayout";
import type { Diagram } from "#/types/diagram";

function fixture(): Diagram {
  return {
    id: "t",
    name: "t",
    driver: "mysql",
    tables: [
      {
        id: "t1",
        name: "users",
        color: "#0ea5e9",
        position: { x: 0, y: 0 },
        columns: [
          { id: "c1", name: "id", type: "int", nullable: false, keyType: "primary", order: 0 },
          { id: "c2", name: "email", type: "varchar", typeParams: "255", nullable: false, keyType: "unique", order: 1 },
        ],
        indexes: [],
      },
      {
        id: "t2",
        name: "orders",
        color: "#f59e0b",
        position: { x: 300, y: 0 },
        columns: [
          { id: "c3", name: "id", type: "int", nullable: false, keyType: "primary", order: 0 },
          { id: "c4", name: "user_id", type: "int", nullable: true, keyType: "none", order: 1 },
        ],
        indexes: [],
      },
    ],
    relationships: [
      {
        id: "r1",
        sourceTableId: "t2",
        sourceColumnId: "c4",
        targetTableId: "t1",
        targetColumnId: "c1",
        cardinality: "one-to-many",
        onDelete: "cascade",
        onUpdate: "restrict",
      },
    ],
    groups: [],
    notes: [],
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

describe("referential actions", () => {
  it("emits ON DELETE/ON UPDATE on FK constraints", () => {
    const sql = generateDdl(fixture());
    expect(sql).toMatch(/ON DELETE CASCADE/);
    expect(sql).toMatch(/ON UPDATE RESTRICT/);
  });

  it("omits actions when unset", () => {
    const d = fixture();
    delete d.relationships[0].onDelete;
    delete d.relationships[0].onUpdate;
    const sql = generateDdl(d);
    expect(sql).not.toMatch(/ON DELETE/);
    expect(sql).not.toMatch(/ON UPDATE/);
  });
});

describe("DdlOptions", () => {
  it("emits DROP TABLE IF EXISTS", () => {
    const sql = generateDdl(fixture(), { dropTable: true });
    expect(sql.match(/DROP TABLE IF EXISTS/g)?.length).toBe(2);
  });

  it("emits CREATE TABLE IF NOT EXISTS", () => {
    const sql = generateDdl(fixture(), { ifNotExists: true });
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS/);
  });

  it("adds ENGINE clause for mysql only", () => {
    const sql = generateDdl(fixture(), { mysqlEngine: true });
    expect(sql).toMatch(/ENGINE=InnoDB/);
    const pg = fixture();
    pg.driver = "postgresql";
    expect(generateDdl(pg, { mysqlEngine: true })).not.toMatch(/ENGINE=/);
  });

  it("generateTableDdl emits only the requested table + its FKs", () => {
    const sql = generateTableDdl(fixture(), "t2");
    expect(sql).toMatch(/CREATE TABLE `orders`/);
    expect(sql).not.toMatch(/CREATE TABLE `users`/);
    expect(sql).toMatch(/ALTER TABLE `orders`/);
  });
});

describe("DBML export/import", () => {
  it("round-trips tables, columns and references", () => {
    const dbml = generateDbml(fixture());
    expect(dbml).toContain("Table users {");
    expect(dbml).toContain("id int [pk, not null]");
    expect(dbml).toMatch(/Ref: orders\.user_id > users\.id/);

    const parsed = parseDbml(dbml);
    expect(parsed.driver).toBe("mysql");
    expect(parsed.tables.map((t) => t.name).sort()).toEqual(["orders", "users"]);
    expect(parsed.relationships).toHaveLength(1);
    expect(parsed.warnings).toEqual([]);
  });

  it("parses a hand-written DBML schema", () => {
    const dbml = `
Table customers {
  id integer [pk]
  name varchar(100) [not null]
  email varchar(255) [unique]
}

Table invoices {
  id integer [pk]
  customer_id integer [not null]
  total decimal(10,2)
}

Ref: invoices.customer_id > customers.id
`;
    const parsed = parseDbml(dbml);
    expect(parsed.tables).toHaveLength(2);
    const customers = parsed.tables.find((t) => t.name === "customers")!;
    expect(customers.columns.find((c) => c.name === "name")?.nullable).toBe(false);
    expect(parsed.relationships).toHaveLength(1);
  });

  it("detects postgresql driver via database_type header", () => {
    const dbml = `Project p { database_type: 'PostgreSQL' }
Table t { id serial [pk] }`;
    const parsed = parseDbml(dbml);
    expect(parsed.driver).toBe("postgresql");
  });
});

describe("rule-based linter", () => {
  it("flags missing primary keys", () => {
    const d = fixture();
    d.tables[0].columns[0].keyType = "none";
    d.tables[0].indexes = [];
    const issues = lintDiagram(d);
    expect(issues.some((i) => i.id === "pk-t1")).toBe(true);
    expect(issues.find((i) => i.id === "pk-t1")?.fix).toBeDefined();
  });

  it("flags duplicate columns as errors", () => {
    const d = fixture();
    d.tables[1].columns.push({
      id: "c5", name: "user_id", type: "int", nullable: true, keyType: "none", order: 2,
    });
    const issues = lintDiagram(d);
    expect(issues.some((i) => i.severity === "error" && /appears more than once/.test(i.message))).toBe(true);
  });

  it("flags unindexed foreign keys", () => {
    const issues = lintDiagram(fixture());
    expect(issues.some((i) => i.id === "fkidx-r1")).toBe(true);
  });

  it("sorts by severity", () => {
    expect(severityOrder("error")).toBeLessThan(severityOrder("warning"));
    expect(severityOrder("warning")).toBeLessThan(severityOrder("info"));
  });
});

describe("auto-layout", () => {
  it("grid layout keeps table count and changes positions", () => {
    const d = fixture();
    const positions = layoutDiagram(d, "grid");
    expect(positions.size).toBe(2);
    let changed = 0;
    for (const t of d.tables) {
      const p = positions.get(t.id)!;
      if (p.x !== t.position.x || p.y !== t.position.y) changed++;
    }
    expect(changed).toBeGreaterThan(0);
  });

  it("force layout is finite", () => {
    const d = fixture();
    const positions = layoutDiagram(d, "force");
    expect(positions.size).toBe(2);
    for (const p of positions.values()) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });
});
