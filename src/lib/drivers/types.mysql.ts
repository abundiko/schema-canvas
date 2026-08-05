import { makeConfig, registerDriver, type DriverTypeSpec } from "./driverConfig";

const INT_ATTRS = { supportsAutoIncrement: true, supportsUnsigned: true };

export const MYSQL_TYPES: DriverTypeSpec[] = [
  { name: "tinyint", params: "length", ...INT_ATTRS },
  { name: "smallint", params: "length", ...INT_ATTRS },
  { name: "mediumint", params: "length", ...INT_ATTRS },
  { name: "int", params: "length", ...INT_ATTRS },
  { name: "integer", params: "length", ...INT_ATTRS },
  { name: "bigint", params: "length", ...INT_ATTRS },
  { name: "decimal", params: "precision-scale" },
  { name: "numeric", params: "precision-scale" },
  { name: "float", params: "precision-scale" },
  { name: "double", params: "precision-scale" },
  { name: "bit", params: "length" },
  { name: "varchar", params: "length" },
  { name: "char", params: "length" },
  { name: "binary", params: "length" },
  { name: "varbinary", params: "length" },
  { name: "tinytext" },
  { name: "text" },
  { name: "mediumtext" },
  { name: "longtext" },
  { name: "tinyblob" },
  { name: "blob" },
  { name: "mediumblob" },
  { name: "longblob" },
  { name: "date" },
  { name: "datetime", params: "length" },
  { name: "timestamp", params: "length" },
  { name: "time", params: "length" },
  { name: "year", params: "length" },
  { name: "boolean" },
  { name: "json" },
  { name: "enum", supportsEnum: true },
  { name: "set", supportsSet: true },
];

registerDriver(
  makeConfig(
    "mysql",
    "MySQL",
    { open: "`", close: "`" },
    "AUTO_INCREMENT",
    false,
    false,
    MYSQL_TYPES,
  ),
);
