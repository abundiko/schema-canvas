export type Driver = "mysql" | "postgresql" | "sqlserver" | "mariadb";

export interface Diagram {
  id: string;
  name: string;
  driver: Driver;
  tables: TableEntity[];
  relationships: Relationship[];
  groups: Group[];
  notes: StickyNote[];
  createdAt: string;
  updatedAt: string;
}

export interface TableEntity {
  id: string;
  name: string;
  color: string;
  position: { x: number; y: number };
  comment?: string;
  groupId?: string | null;
  columns: Column[];
  indexes: CompositeIndex[];
}

export interface Column {
  id: string;
  name: string;
  type: string;
  typeParams?: string;
  isArray?: boolean;
  nullable: boolean;
  keyType: "none" | "primary" | "unique" | "index";
  default?: { raw: string; kind: "function" | "number" | "string" };
  autoIncrement?: boolean;
  identity?: { seed: number; increment: number };
  unsigned?: boolean;
  enumValues?: string[];
  setValues?: string[];
  comment?: string;
  order: number;
}

export interface CompositeIndex {
  id: string;
  columnIds: string[];
  type: "primary" | "unique" | "index";
  order: number;
}

export type Cardinality = "one-to-one" | "one-to-many" | "many-to-many";

export interface Relationship {
  id: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  cardinality: Cardinality;
}

export interface Group {
  id: string;
  name: string;
  color: string;
  bounds: { x: number; y: number; width: number; height: number };
}

export interface StickyNote {
  id: string;
  content: string;
  color: string;
  fontSize: "S" | "M" | "L" | "XL";
  position: { x: number; y: number };
  size: { width: number; height: number };
  groupId?: string | null;
}

export type Selection =
  | { type: "none" }
  | { type: "table"; tableId: string }
  | { type: "tables"; tableIds: string[] }
  | { type: "group"; groupId: string }
  | { type: "note"; noteId: string }
  | { type: "relationship"; relationshipId: string };

export type ActiveTool = "select" | "pan" | "table" | "group" | "note";
