import { describe, expect, it } from "vitest";
import { parseDdl, detectDriver } from "#/lib/ddl/parseDdl";
import { generateDdl } from "#/lib/ddl/generateDdl";
import type { Diagram, Driver } from "#/types/diagram";

function toDiagram(driver: Driver, sql: string): Diagram {
  const parsed = parseDdl(sql, { driver });
  return {
    id: "test",
    name: "test",
    driver,
    tables: parsed.tables,
    relationships: parsed.relationships,
    groups: [],
    notes: [],
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

const MYSQL_SQL = `
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(120) DEFAULT 'anon',
  status ENUM('active', 'disabled') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_name (name)
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total DECIMAL(10,2) UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`;

const PG_SQL = `
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  tags TEXT[],
  meta JSONB,
  CONSTRAINT uq_email UNIQUE (email)
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
`;

const MSSQL_SQL = `
CREATE TABLE users (
  id INT IDENTITY(1,1) PRIMARY KEY,
  email NVARCHAR(255) NOT NULL,
  CONSTRAINT uq_email UNIQUE (email)
);

CREATE TABLE orders (
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`;

const MARIA_SQL = `
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  active TINYINT(1) DEFAULT 1
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`;

describe("detectDriver", () => {
  it("detects mysql/mariadb via backticks and auto_increment", () => {
    expect(detectDriver(MYSQL_SQL)).toBe("mysql");
  });
  it("detects postgresql via serial and []", () => {
    expect(detectDriver(PG_SQL)).toBe("postgresql");
  });
  it("detects sqlserver via identity", () => {
    expect(detectDriver(MSSQL_SQL)).toBe("sqlserver");
  });
});

describe.each<{ driver: Driver; label: string; sql: string }>([
  { driver: "mysql", label: "MySQL", sql: MYSQL_SQL },
  { driver: "postgresql", label: "PostgreSQL", sql: PG_SQL },
  { driver: "sqlserver", label: "SQL Server", sql: MSSQL_SQL },
  { driver: "mariadb", label: "MariaDB", sql: MARIA_SQL },
])("parse+generate round-trip: $label", ({ driver, sql }) => {
  it("parses tables, columns, pk/unique and relationships", () => {
    const parsed = parseDdl(sql, { driver });
    const names = parsed.tables.map((t) => t.name);
    expect(names).toContain("users");
    expect(names).toContain("orders");

    const users = parsed.tables.find((t) => t.name === "users")!;
    expect(users.columns.some((c) => c.keyType === "primary")).toBe(true);

    const orders = parsed.tables.find((t) => t.name === "orders")!;
    expect(orders.columns.some((c) => c.keyType === "unique")).toBe(false);

    expect(parsed.relationships.length).toBeGreaterThan(0);
    const rel = parsed.relationships[0];
    expect(rel.sourceTableId).not.toBe(rel.targetTableId);
  });

  it("generates SQL that re-parses", () => {
    const diagram = toDiagram(driver, sql);
    const out = generateDdl(diagram);
    expect(out.toLowerCase()).toContain("create table");

    const reparsed = parseDdl(out, { driver });
    expect(reparsed.tables.map((t) => t.name).sort()).toEqual(
      diagram.tables.map((t) => t.name).sort(),
    );
  });
});

describe("driver-specific syntax", () => {
  it("uses SERIAL for postgres auto columns", () => {
    const diagram = toDiagram("postgresql", PG_SQL);
    const out = generateDdl(diagram);
    expect(out).toMatch(/serial/i);
  });

  it("uses IDENTITY for sql server auto columns", () => {
    const diagram = toDiagram("sqlserver", MSSQL_SQL);
    const out = generateDdl(diagram);
    expect(out).toMatch(/identity/i);
  });

  it("uses AUTO_INCREMENT for mysql/mariadb", () => {
    const diagram = toDiagram("mysql", MYSQL_SQL);
    const out = generateDdl(diagram);
    expect(out).toMatch(/auto_increment/i);
  });

  it("preserves postgres array suffix", () => {
    const parsed = parseDdl(PG_SQL, { driver: "postgresql" });
    const tags = parsed.tables[0].columns.find((c) => c.name === "tags")!;
    expect(tags.isArray).toBe(true);
  });

  it("preserves mysql enum values", () => {
    const parsed = parseDdl(MYSQL_SQL, { driver: "mysql" });
    const status = parsed.tables[0].columns.find((c) => c.name === "status")!;
    expect(status.enumValues).toEqual(["active", "disabled"]);
  });
});

describe("columns without a type", () => {
  it("defaults an untyped column to varchar instead of skipping it", () => {
    const sql = `CREATE TABLE notes (
      id INT PRIMARY KEY,
      body,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`;
    const parsed = parseDdl(sql, { driver: "mysql" });
    const table = parsed.tables[0];
    const body = table.columns.find((c) => c.name === "body");
    expect(body).toBeDefined();
    expect(body!.type).toBe("varchar");
    expect(parsed.warnings.some((w) => w.includes("no type"))).toBe(true);
    expect(table.columns).toHaveLength(3);
  });

  it("still parses an untyped column with inline attributes", () => {
    const sql = `CREATE TABLE events (
      id INT PRIMARY KEY
    );
    CREATE TABLE audit (
      id INT PRIMARY KEY,
      payload REFERENCES events(id)
    );`;
    const parsed = parseDdl(sql, { driver: "postgresql" });
    const payload = parsed.tables.find((t) => t.name === "audit")!
      .columns.find((c) => c.name === "payload")!;
    expect(payload.type).toBe("varchar");
    expect(parsed.relationships).toHaveLength(1);
  });
});

describe("large imports", () => {
  it("parses more than 20 tables without dropping any", () => {
    const tables = Array.from({ length: 30 }, (_, i) =>
      `CREATE TABLE t${i} ( id INT PRIMARY KEY, value VARCHAR(100) );`,
    ).join("\n");
    const parsed = parseDdl(tables, { driver: "mysql" });
    expect(parsed.tables).toHaveLength(30);
  });
});
