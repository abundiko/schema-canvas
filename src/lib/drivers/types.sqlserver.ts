import { makeConfig, registerDriver, type DriverTypeSpec } from "./driverConfig";

const ID_ATTRS = { supportsIdentity: true };

export const SQLSERVER_TYPES: DriverTypeSpec[] = [
  { name: "tinyint", ...ID_ATTRS },
  { name: "smallint", ...ID_ATTRS },
  { name: "int", ...ID_ATTRS },
  { name: "integer", label: "integer", ...ID_ATTRS },
  { name: "bigint", ...ID_ATTRS },
  { name: "decimal", params: "precision-scale" },
  { name: "numeric", params: "precision-scale" },
  { name: "smallmoney" },
  { name: "money" },
  { name: "float", params: "length" },
  { name: "real" },
  { name: "bit" },
  { name: "char", params: "length" },
  { name: "varchar", params: "length" },
  { name: "nchar", params: "length" },
  { name: "nvarchar", params: "length" },
  { name: "text" },
  { name: "ntext" },
  { name: "binary", params: "length" },
  { name: "varbinary", params: "length" },
  { name: "image" },
  { name: "date" },
  { name: "time", params: "length" },
  { name: "datetime", params: "length" },
  { name: "datetime2", params: "length" },
  { name: "smalldatetime" },
  { name: "datetimeoffset", params: "length" },
  { name: "uniqueidentifier" },
  { name: "rowversion" },
  { name: "xml" },
  { name: "sql_variant" },
];

registerDriver(
  makeConfig(
    "sqlserver",
    "SQL Server",
    { open: "[", close: "]" },
    "IDENTITY",
    true,
    false,
    SQLSERVER_TYPES,
  ),
);
