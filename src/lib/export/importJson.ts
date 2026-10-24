import type {
  Cardinality,
  Column,
  CompositeIndex,
  Diagram,
  Driver,
  Group,
  ReferentialAction,
  Relationship,
  StickyNote,
  TableEntity,
} from "#/types/diagram";
import { createId } from "#/lib/utils/ids";
import { normalizeImportedTableColors } from "#/lib/utils/palettes";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringArray(value: unknown): string[] {
  return asArray(value).filter((v): v is string => typeof v === "string");
}

function isDriver(value: unknown): value is Driver {
  return (
    value === "mysql" ||
    value === "postgresql" ||
    value === "sqlserver" ||
    value === "mariadb" ||
    value === "mongodb"
  );
}

function isKeyType(value: unknown): value is Column["keyType"] {
  return (
    value === "none" ||
    value === "primary" ||
    value === "unique" ||
    value === "index"
  );
}

function isIndexType(value: unknown): value is CompositeIndex["type"] {
  return value === "primary" || value === "unique" || value === "index";
}

function isCardinality(value: unknown): value is Cardinality {
  return (
    value === "one-to-one" ||
    value === "one-to-many" ||
    value === "many-to-many"
  );
}

function isReferentialAction(value: unknown): value is ReferentialAction {
  return (
    value === "cascade" ||
    value === "restrict" ||
    value === "set null" ||
    value === "no action" ||
    value === "set default"
  );
}

function parseColumn(raw: unknown, index: number): Column | null {
  if (!isRecord(raw)) return null;
  const name = asString(raw.name).trim();
  if (!name) return null;

  const column: Column = {
    id: asString(raw.id) || createId("col"),
    name,
    type: asString(raw.type, "varchar"),
    nullable: asBoolean(raw.nullable, true),
    keyType: isKeyType(raw.keyType) ? raw.keyType : "none",
    order: asNumber(raw.order, index),
  };

  if (typeof raw.typeParams === "string") column.typeParams = raw.typeParams;
  if (asBoolean(raw.isArray)) column.isArray = true;
  if (asBoolean(raw.autoIncrement)) column.autoIncrement = true;
  if (asBoolean(raw.unsigned)) column.unsigned = true;
  if (typeof raw.comment === "string") column.comment = raw.comment;

  if (isRecord(raw.default) && typeof raw.default.raw === "string") {
    const kind = raw.default.kind;
    if (kind === "function" || kind === "number" || kind === "string") {
      column.default = { raw: raw.default.raw, kind };
    }
  }

  if (isRecord(raw.identity)) {
    column.identity = {
      seed: asNumber(raw.identity.seed, 1),
      increment: asNumber(raw.identity.increment, 1),
    };
  }

  const enumValues = stringArray(raw.enumValues);
  if (enumValues.length > 0) column.enumValues = enumValues;
  const setValues = stringArray(raw.setValues);
  if (setValues.length > 0) column.setValues = setValues;

  return column;
}

function parseIndex(
  raw: unknown,
  index: number,
  columnIds: Set<string>,
): CompositeIndex | null {
  if (!isRecord(raw)) return null;
  const ids = stringArray(raw.columnIds).filter((id) => columnIds.has(id));
  if (ids.length === 0) return null;

  return {
    id: asString(raw.id) || createId("idx"),
    columnIds: ids,
    type: isIndexType(raw.type) ? raw.type : "index",
    order: asNumber(raw.order, index),
  };
}

function parseTable(raw: unknown, index: number): TableEntity | null {
  if (!isRecord(raw)) return null;

  const columns = asArray(raw.columns)
    .map((column, columnIndex) => parseColumn(column, columnIndex))
    .filter((column): column is Column => column !== null);
  const columnIds = new Set(columns.map((column) => column.id));
  const indexes = asArray(raw.indexes)
    .map((entry, entryIndex) => parseIndex(entry, entryIndex, columnIds))
    .filter((entry): entry is CompositeIndex => entry !== null);
  const position = asRecord(raw.position);

  const table: TableEntity = {
    id: asString(raw.id) || createId("tbl"),
    name: asString(raw.name).trim() || `table_${index + 1}`,
    color: asString(raw.color),
    position: { x: asNumber(position.x), y: asNumber(position.y) },
    columns,
    indexes,
  };

  if (typeof raw.comment === "string") table.comment = raw.comment;
  if (typeof raw.groupId === "string" && raw.groupId) {
    table.groupId = raw.groupId;
  }

  return table;
}

function parseRelationship(raw: unknown): Relationship | null {
  if (!isRecord(raw)) return null;

  const sourceTableId = asString(raw.sourceTableId);
  const sourceColumnId = asString(raw.sourceColumnId);
  const targetTableId = asString(raw.targetTableId);
  const targetColumnId = asString(raw.targetColumnId);
  if (!sourceTableId || !sourceColumnId || !targetTableId || !targetColumnId) {
    return null;
  }

  const relationship: Relationship = {
    id: asString(raw.id) || createId("rel"),
    sourceTableId,
    sourceColumnId,
    targetTableId,
    targetColumnId,
    cardinality: isCardinality(raw.cardinality)
      ? raw.cardinality
      : "one-to-many",
  };

  if (isReferentialAction(raw.onDelete)) relationship.onDelete = raw.onDelete;
  if (isReferentialAction(raw.onUpdate)) relationship.onUpdate = raw.onUpdate;

  return relationship;
}

function parseGroup(raw: unknown, index: number): Group | null {
  if (!isRecord(raw)) return null;
  const bounds = asRecord(raw.bounds);

  return {
    id: asString(raw.id) || createId("grp"),
    name: asString(raw.name).trim() || `Group ${index + 1}`,
    color: asString(raw.color) || "#818cf8",
    bounds: {
      x: asNumber(bounds.x),
      y: asNumber(bounds.y),
      width: asNumber(bounds.width, 400),
      height: asNumber(bounds.height, 300),
    },
  };
}

function isNoteFontSize(value: unknown): value is StickyNote["fontSize"] {
  return value === "S" || value === "M" || value === "L" || value === "XL";
}

function parseNote(raw: unknown): StickyNote | null {
  if (!isRecord(raw)) return null;
  const position = asRecord(raw.position);
  const size = asRecord(raw.size);

  return {
    id: asString(raw.id) || createId("note"),
    content: asString(raw.content),
    color: asString(raw.color) || "#fef3c7",
    fontSize: isNoteFontSize(raw.fontSize) ? raw.fontSize : "M",
    position: { x: asNumber(position.x), y: asNumber(position.y) },
    size: {
      width: asNumber(size.width, 180),
      height: asNumber(size.height, 140),
    },
    groupId:
      typeof raw.groupId === "string" && raw.groupId ? raw.groupId : undefined,
  };
}

export function parseDiagramJson(source: string): Diagram {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "invalid JSON";
    throw new Error(`Invalid JSON: ${reason}`);
  }

  if (!isRecord(parsed)) {
    throw new Error("This JSON does not contain a diagram object.");
  }
  if (!Array.isArray(parsed.tables)) {
    throw new Error('This JSON does not contain a diagram (missing "tables").');
  }

  const tables = normalizeImportedTableColors(
    parsed.tables
      .map((table, index) => parseTable(table, index))
      .filter((table): table is TableEntity => table !== null),
  );

  const tableById = new Map(tables.map((table) => [table.id, table]));
  const relationships = asArray(parsed.relationships)
    .map((relationship) => parseRelationship(relationship))
    .filter((relationship): relationship is Relationship => {
      if (!relationship) return false;
      const source = tableById.get(relationship.sourceTableId);
      const target = tableById.get(relationship.targetTableId);
      return (
        !!source?.columns.some((c) => c.id === relationship.sourceColumnId) &&
        !!target?.columns.some((c) => c.id === relationship.targetColumnId)
      );
    });

  const groups = asArray(parsed.groups)
    .map((group, index) => parseGroup(group, index))
    .filter((group): group is Group => group !== null);
  const groupIds = new Set(groups.map((group) => group.id));
  for (const table of tables) {
    if (table.groupId && !groupIds.has(table.groupId)) delete table.groupId;
  }

  const notes = asArray(parsed.notes)
    .map((note) => parseNote(note))
    .filter((note): note is StickyNote => note !== null);
  for (const note of notes) {
    if (note.groupId && !groupIds.has(note.groupId)) delete note.groupId;
  }

  const now = new Date().toISOString();
  return {
    id: asString(parsed.id) || createId("diag"),
    name: asString(parsed.name).trim() || "Imported diagram",
    description:
      typeof parsed.description === "string" && parsed.description
        ? parsed.description
        : undefined,
    driver: isDriver(parsed.driver) ? parsed.driver : "mysql",
    tables,
    relationships,
    groups,
    notes,
    createdAt: asString(parsed.createdAt) || now,
    updatedAt: asString(parsed.updatedAt) || now,
  };
}
