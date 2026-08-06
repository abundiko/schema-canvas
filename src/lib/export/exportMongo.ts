import type { Column, Diagram, Relationship } from "#/types/diagram";

function bsonType(col: Column): { bsonType: string } {
  const base = col.type.toLowerCase();
  switch (base) {
    case "objectid":
      return { bsonType: "objectId" };
    case "string":
      return { bsonType: "string" };
    case "number":
    case "double":
    case "int":
      return { bsonType: "number" };
    case "long":
      return { bsonType: "long" };
    case "decimal128":
      return { bsonType: "decimal" };
    case "boolean":
      return { bsonType: "bool" };
    case "date":
    case "timestamp":
      return { bsonType: "date" };
    case "binary":
      return { bsonType: "binData" };
    case "regex":
      return { bsonType: "regex" };
    case "null":
      return { bsonType: "null" };
    case "array":
      return { bsonType: "array" };
    case "object":
    case "mixed":
    case "map":
    default:
      return { bsonType: "object" };
  }
}

function isObjectIdColumn(diagram: Diagram, col: Column): boolean {
  const type = col.type.toLowerCase();
  if (type === "objectid") return true;
  // a primary key named id is the classic _id
  return diagram.driver === "mongodb" && col.keyType === "primary" && /^id$/i.test(col.name);
}

export function generateMongoJson(diagram: Diagram): string {
  const defs: Record<string, unknown> = {};
  const collectionRefs: Record<string, unknown> = {};

  const relBySource = new Map<string, Relationship[]>();
  for (const rel of diagram.relationships) {
    const list = relBySource.get(rel.sourceTableId) ?? [];
    list.push(rel);
    relBySource.set(rel.sourceTableId, list);
  }

  for (const table of diagram.tables) {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    const cols = [...table.columns].sort((a, b) => a.order - b.order);
    for (const c of cols) {
      const isId = isObjectIdColumn(diagram, c);
      const key = isId ? "_id" : c.name || "unnamed";
      const rel = relBySource.get(table.id)?.find((r) => r.sourceColumnId === c.id);

      let schema: unknown;
      if (rel) {
        const target = diagram.tables.find((t) => t.id === rel.targetTableId);
        const desc = target ? `reference to ${target.name}` : "reference";
        if (c.type.toLowerCase() === "objectid") {
          schema = c.isArray
            ? { bsonType: "array", items: { bsonType: "objectId", description: desc } }
            : { bsonType: "objectId", description: desc };
        } else {
          schema = { $ref: `#/$defs/${target?.name ?? "unknown"}` };
        }
      } else if (isId) {
        schema = { bsonType: "objectId" };
      } else {
        const t = bsonType(c);
        schema = c.isArray ? { bsonType: "array", items: t } : t;
      }

      properties[key] = schema;
      if (isId) required.push("_id");
      else if (!c.nullable) required.push(key);
    }

    defs[table.name] = {
      title: table.name,
      type: "object",
      additionalProperties: false,
      ...(required.length > 0 ? { required } : {}),
      properties,
    };
    collectionRefs[table.name] = { $ref: `#/$defs/${table.name}` };
  }

  return JSON.stringify(
    {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      description: `MongoDB collections for "${diagram.name}".`,
      $defs: defs,
      collections: collectionRefs,
    },
    null,
    2,
  );
}
