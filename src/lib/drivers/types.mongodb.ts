import { makeConfig, registerDriver, type DriverTypeSpec } from "./driverConfig";

export const MONGODB_TYPES: DriverTypeSpec[] = [
  { name: "objectid" },
  { name: "string", params: "length" },
  { name: "number" },
  { name: "int", label: "int32" },
  { name: "long" },
  { name: "double" },
  { name: "decimal128" },
  { name: "boolean", label: "bool" },
  { name: "date" },
  { name: "timestamp" },
  { name: "array", params: "length" },
  { name: "object", label: "document" },
  { name: "mixed" },
  { name: "map" },
  { name: "binary", label: "binData" },
  { name: "regex" },
  { name: "null" },
  { name: "undefined" },
];

const ARRAYABLE = new Set([
  "objectid",
  "string",
  "number",
  "int",
  "long",
  "double",
  "decimal128",
  "boolean",
  "date",
  "timestamp",
  "object",
  "mixed",
  "map",
  "binary",
  "regex",
]);
for (const t of MONGODB_TYPES) {
  if (ARRAYABLE.has(t.name)) t.supportsArray = true;
}

registerDriver(
  makeConfig(
    "mongodb",
    "MongoDB",
    { open: "`", close: "`" },
    "",
    false,
    true,
    MONGODB_TYPES,
  ),
);
