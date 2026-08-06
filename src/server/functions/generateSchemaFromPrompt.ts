import { createGroq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Driver } from "#/types/diagram";

export interface AiProposedTable {
  name: string;
  color: string;
  columns: Array<{
    name: string;
    type: string;
    typeParams?: string;
    nullable: boolean;
    keyType: "none" | "primary" | "unique" | "index";
  }>;
}

export interface AiProposedRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

export interface AiGenerateResult {
  driver: "mysql" | "postgresql" | "sqlserver" | "mariadb";
  tables: AiProposedTable[];
  relationships: AiProposedRelationship[];
  summary: string;
  source?: "groq" | "mock";
}

export interface GenerateSchemaInput {
  prompt: string;
  existing: string[];
  driver: Driver;
}

const SQL_DRIVERS = z.enum(["mysql", "postgresql", "sqlserver", "mariadb"]);

// All fields are required because Groq strict structured outputs (json_schema
// with strict: true) requires that; empty strings are normalized to `undefined`
// after validation.
const generationSchema = z.object({
  driver: SQL_DRIVERS,
  tables: z.array(
    z.object({
      name: z.string(),
      color: z.string(),
      columns: z.array(
        z.object({
          name: z.string(),
          type: z.string(),
          typeParams: z.string(),
          nullable: z.boolean(),
          keyType: z.enum(["none", "primary", "unique", "index"]),
        }),
      ),
    }),
  ),
  relationships: z.array(
    z.object({
      fromTable: z.string(),
      fromColumn: z.string(),
      toTable: z.string(),
      toColumn: z.string(),
    }),
  ),
  summary: z.string(),
});

const SWATCH_LIST =
  "#f87171, #fb923c, #fbbf24, #fde047, #a3e635, #4ade80, #2dd4bf, #22d3ee, #60a5fa, #818cf8, #a78bfa, #f472b6";

const SYSTEM_PROMPT = `You are a senior database schema designer for a DrawSQL-style ER diagram tool.
The user will describe tables they want to add to an existing schema. Design new tables and
relationships that fit naturally alongside the existing tables.

Rules:
- Return only the requested new tables (1 to 8 tables). Never redesign or duplicate the existing tables.
- Use snake_case for table and column names.
- Every table must have exactly one column with keyType "primary" (usually an "id" column).
- Foreign-key columns that reference another table must use keyType "index" (never primary/unique).
- Column "type" must be a valid type for the target SQL driver (e.g. int, bigint, varchar, char,
  text, decimal, numeric, float, double, boolean, date, datetime, timestamp, time, uuid, json, enum).
  Use "typeParams" for precision/length (e.g. varchar → "255", decimal → "10,2").
- "color" must be one of: ${SWATCH_LIST}.
- "relationships" must reference columns exactly as defined (fromTable.fromColumn →
  toTable.toColumn). Relationships may point at existing tables from the provided context or at
  newly generated tables, but every referenced table/column must exist.
- "driver" must be the driver provided in the request.`;

const GROQ_MODEL = "openai/gpt-oss-120b";

const BILLING_SCHEMA: AiGenerateResult = {
  driver: "mysql",
  tables: [
    {
      name: "customers",
      color: "#818cf8",
      columns: [
        { name: "id", type: "int", nullable: false, keyType: "primary" },
        { name: "email", type: "varchar", nullable: false, keyType: "unique" },
        { name: "name", type: "varchar", nullable: true, keyType: "none" },
        { name: "created_at", type: "datetime", nullable: true, keyType: "none" },
      ],
    },
    {
      name: "invoices",
      color: "#4ade80",
      columns: [
        { name: "id", type: "int", nullable: false, keyType: "primary" },
        { name: "customer_id", type: "int", nullable: false, keyType: "index" },
        { name: "number", type: "varchar", nullable: false, keyType: "none" },
        { name: "status", type: "varchar", nullable: false, keyType: "none" },
        { name: "issued_at", type: "datetime", nullable: false, keyType: "none" },
      ],
    },
    {
      name: "invoice_items",
      color: "#f472b6",
      columns: [
        { name: "id", type: "int", nullable: false, keyType: "primary" },
        { name: "invoice_id", type: "int", nullable: false, keyType: "index" },
        { name: "description", type: "varchar", nullable: false, keyType: "none" },
        { name: "quantity", type: "int", nullable: false, keyType: "none" },
        { name: "unit_price", type: "decimal", typeParams: "10,2", nullable: false, keyType: "none" },
      ],
    },
  ],
  relationships: [
    { fromTable: "invoices", fromColumn: "customer_id", toTable: "customers", toColumn: "id" },
    { fromTable: "invoice_items", fromColumn: "invoice_id", toTable: "invoices", toColumn: "id" },
  ],
  summary:
    "Customers are billed on invoices; each invoice item line belongs to one invoice. Invoices reference the customer via customer_id.",
};

const USER_SCHEMA: AiGenerateResult = {
  driver: "mysql",
  tables: [
    {
      name: "users",
      color: "#60a5fa",
      columns: [
        { name: "id", type: "int", nullable: false, keyType: "primary" },
        { name: "email", type: "varchar", nullable: false, keyType: "unique" },
        { name: "password_hash", type: "varchar", nullable: false, keyType: "none" },
        { name: "created_at", type: "datetime", nullable: true, keyType: "none" },
      ],
    },
    {
      name: "sessions",
      color: "#fb923c",
      columns: [
        { name: "id", type: "int", nullable: false, keyType: "primary" },
        { name: "user_id", type: "int", nullable: false, keyType: "index" },
        { name: "token", type: "varchar", nullable: false, keyType: "none" },
        { name: "expires_at", type: "datetime", nullable: false, keyType: "none" },
      ],
    },
  ],
  relationships: [
    { fromTable: "sessions", fromColumn: "user_id", toTable: "users", toColumn: "id" },
  ],
  summary:
    "Users authenticate and own sessions; each session references its user via user_id.",
};

function mockGenerate(prompt: string): AiGenerateResult {
  const p = prompt.toLowerCase();
  const result: AiGenerateResult = /invoice|billing|order|payment/.test(p)
    ? BILLING_SCHEMA
    : /user|auth|login|account/.test(p)
      ? USER_SCHEMA
      : BILLING_SCHEMA;
  return { ...result, source: "mock" };
}

export const generateSchemaFromPrompt = createServerFn({ method: "POST" })
  .validator((input: GenerateSchemaInput) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return mockGenerate(data.prompt);

    const context =
      data.existing.length > 0
        ? `Existing tables already in the schema: ${data.existing.join(", ")}.`
        : "The schema is currently empty.";

    try {
      const { object } = await generateObject({
        model: createGroq({ apiKey })(GROQ_MODEL),
        schema: generationSchema,
        schemaName: "schema_design",
        schemaDescription: "New tables and relationships to add to the existing schema",
        temperature: 0.4,
        system: SYSTEM_PROMPT,
        prompt: `${context}\nSQL driver: ${data.driver}.\n\nUser request: ${data.prompt}\n\nRespond with a single JSON object matching the provided schema.`,
      });
      const tables = object.tables.map((t) => ({
        ...t,
        columns: t.columns.map((c) => ({
          ...c,
          typeParams: c.typeParams || undefined,
        })),
      }));
      return { ...object, tables, source: "groq" as const };
    } catch (err) {
      console.error("[ai] Groq schema generation failed, falling back to mock:", err);
      return mockGenerate(data.prompt);
    }
  });
