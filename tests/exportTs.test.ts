import { describe, expect, it } from "vitest";
import { generateTsTypes, tsTypeFor, pascalCase } from "#/lib/export/exportTs";
import { generateMongoJson } from "#/lib/export/exportMongo";
import { generateDdl } from "#/lib/ddl/generateDdl";
import { generateDbml } from "#/lib/dbml/generateDbml";
import { parseDbml } from "#/lib/dbml/parseDbml";
import type { Diagram } from "#/types/diagram";

function fixture(driver: Diagram["driver"] = "mysql"): Diagram {
  return {
    id: "t",
    name: "invoice",
    driver,
    tables: [
      {
        id: "t1",
        name: "users",
        color: "#0ea5e9",
        position: { x: 0, y: 0 },
        columns: [
          { id: "c1", name: "id", type: "int", nullable: false, keyType: "primary", order: 0 },
          { id: "c2", name: "email", type: "varchar", typeParams: "255", nullable: false, keyType: "unique", order: 1 },
          { id: "c3", name: "active", type: "boolean", nullable: true, keyType: "none", order: 2 },
          { id: "c4", name: "created_at", type: "datetime", nullable: false, keyType: "none", order: 3 },
          { id: "c5", name: "profile", type: "json", nullable: true, keyType: "none", order: 4 },
          { id: "c6", name: "status", type: "enum", enumValues: ["active", "disabled"], nullable: false, keyType: "none", order: 5 },
        ],
        indexes: [],
      },
      {
        id: "t2",
        name: "order_items",
        color: "#f59e0b",
        position: { x: 300, y: 0 },
        columns: [
          { id: "c7", name: "id", type: "bigint", nullable: false, keyType: "primary", order: 0 },
          { id: "c8", name: "user_id", type: "int", nullable: true, keyType: "none", order: 1 },
          { id: "c9", name: "tags", type: "varchar", typeParams: "50", isArray: true, nullable: true, keyType: "none", order: 2 },
        ],
        indexes: [],
      },
    ],
    relationships: [
      { id: "r1", sourceTableId: "t2", sourceColumnId: "c8", targetTableId: "t1", targetColumnId: "c1", cardinality: "one-to-many" },
    ],
    groups: [],
    notes: [],
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

describe("pascalCase", () => {
  it("capitalizes word parts", () => {
    expect(pascalCase("users")).toBe("Users");
    expect(pascalCase("order_items")).toBe("OrderItems");
    expect(pascalCase("invoice lines")).toBe("InvoiceLines");
    expect(pascalCase("")).toBe("Type");
  });
});

describe("generateTsTypes", () => {
  it("emits PascalCase types, not interfaces", () => {
    const out = generateTsTypes(fixture());
    expect(out).toContain("export type Users = {");
    expect(out).toContain("export type OrderItems = {");
    expect(out).not.toMatch(/interface\s+\w+/);
    expect(out).not.toMatch(/export\s+interface/);
  });

  it("maps column types to TS types", () => {
    const out = generateTsTypes(fixture());
    expect(out).toContain("id: number;");
    expect(out).toContain("email: string;");
    expect(out).toContain("active: boolean | null;");
    expect(out).toContain("created_at: Date;");
    expect(out).toContain("profile: Record<string, unknown> | null;");
    expect(out).toContain('status: "active" | "disabled";');
    expect(out).toContain("tags: string[] | null;");
  });

  it("keeps relationships as typed references", () => {
    const out = generateTsTypes(fixture());
    expect(out).toContain("user?: Users | null;");
  });

  it("avoids reference name collisions", () => {
    const d = fixture();
    // add a column literally named "user" and point the relationship at a table named "user"
    d.tables[1].columns.push({
      id: "c10", name: "user", type: "varchar", typeParams: "50", nullable: true, keyType: "none", order: 3,
    });
    d.tables[0].name = "user";
    const targetId = "tx";
    d.tables[0].id = targetId;
    d.relationships[0].targetTableId = targetId;
    const out = generateTsTypes(d);
    expect(out).toContain("userRef?: User | null;");
  });

  it("handles an empty diagram", () => {
    const d = fixture();
    d.tables = [];
    d.relationships = [];
    const out = generateTsTypes(d);
    expect(out).toContain("empty diagram");
  });
});

function mongoFixture(): Diagram {
  return {
    id: "t",
    name: "invoice",
    driver: "mongodb",
    tables: [
      {
        id: "t1",
        name: "users",
        color: "#0ea5e9",
        position: { x: 0, y: 0 },
        columns: [
          { id: "c1", name: "id", type: "objectid", nullable: false, keyType: "primary", order: 0 },
          { id: "c2", name: "email", type: "string", nullable: false, keyType: "unique", order: 1 },
          { id: "c3", name: "active", type: "boolean", nullable: true, keyType: "none", order: 2 },
          { id: "c4", name: "created_at", type: "date", nullable: false, keyType: "none", order: 3 },
          { id: "c5", name: "profile", type: "object", nullable: true, keyType: "none", order: 4 },
          { id: "c6", name: "status", type: "string", nullable: false, keyType: "none", order: 5 },
        ],
        indexes: [],
      },
      {
        id: "t2",
        name: "order_items",
        color: "#f59e0b",
        position: { x: 300, y: 0 },
        columns: [
          { id: "c7", name: "id", type: "objectid", nullable: false, keyType: "primary", order: 0 },
          { id: "c8", name: "user_id", type: "objectid", nullable: true, keyType: "none", order: 1 },
          { id: "c9", name: "tags", type: "string", isArray: true, nullable: true, keyType: "none", order: 2 },
        ],
        indexes: [],
      },
    ],
    relationships: [
      { id: "r1", sourceTableId: "t2", sourceColumnId: "c8", targetTableId: "t1", targetColumnId: "c1", cardinality: "one-to-many" },
    ],
    groups: [],
    notes: [],
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

describe("mongo TS types", () => {
  it("maps the id primary key to string", () => {
    const d = mongoFixture();
    expect(tsTypeFor(d, d.tables[0].columns[0])).toBe("string");
  });

  it("generates PascalCase types with relationship references", () => {
    const out = generateTsTypes(mongoFixture());
    expect(out).toContain("export type Users = {");
    expect(out).toContain("export type OrderItems = {");
    expect(out).toContain("user?: Users | null;");
    expect(out).toContain("id: string;");
  });
});

describe("generateMongoJson", () => {
  it("emits _id as objectId and string fields as bsonType string", () => {
    const d = mongoFixture();
    const out = generateMongoJson(d);
    expect(out).toContain('"_id": {');
    expect(out).toContain('"bsonType": "objectId"');
    expect(out).toContain('"email": {');
    expect(out).toContain('"bsonType": "string"');
  });

  it("describes objectId relationships with a reference note", () => {
    const d = mongoFixture();
    const out = generateMongoJson(d);
    expect(out).toContain("reference to users");
  });

  it("uses $ref for non-objectId relationship columns", () => {
    const d = mongoFixture();
    d.tables[1].columns[1].type = "string";
    const out = generateMongoJson(d);
    expect(out).toContain('"$ref": "#/$defs/users"');
  });

  it("produces valid JSON with required fields", () => {
    const parsed = JSON.parse(generateMongoJson(mongoFixture()));
    expect(parsed.collections).toHaveProperty("order_items");
    expect(parsed.$defs.users.properties.email.bsonType).toBe("string");
    expect(parsed.$defs.users.required).toContain("_id");
  });
});

describe("mongo driver integration", () => {
  it("generateDdl returns a notice instead of SQL", () => {
    const out = generateDdl(fixture("mongodb"));
    expect(out).toContain("MongoDB collections are documents");
    expect(out).not.toMatch(/CREATE TABLE/);
  });

  it("DBML round-trips the mongodb driver", () => {
    const d = mongoFixture();
    const dbml = generateDbml(d);
    expect(dbml).toContain("database_type: 'MongoDB'");
    const parsed = parseDbml(dbml);
    expect(parsed.driver).toBe("mongodb");
    expect(parsed.tables).toHaveLength(2);
  });
});
