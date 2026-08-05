import { createServerFn } from "@tanstack/react-start";

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
}

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

export const generateSchemaFromPrompt = createServerFn({ method: "POST" })
  .validator((prompt: string) => prompt)
  .handler(async ({ data }) => {
    await new Promise((r) => setTimeout(r, 400));
    const p = data.toLowerCase();
    if (/invoice|billing|order|payment/.test(p)) return BILLING_SCHEMA;
    if (/user|auth|login|account/.test(p)) return USER_SCHEMA;
    return BILLING_SCHEMA;
  });
