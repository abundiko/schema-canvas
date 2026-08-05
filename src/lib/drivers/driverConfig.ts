import type { Driver } from "#/types/diagram";

export interface DriverTypeSpec {
  name: string;
  label?: string;
  params?: "length" | "precision-scale";
  supportsAutoIncrement?: boolean;
  supportsUnsigned?: boolean;
  supportsEnum?: boolean;
  supportsSet?: boolean;
  supportsArray?: boolean;
  supportsIdentity?: boolean;
}

export interface DriverConfig {
  id: Driver;
  label: string;
  quote: { open: string; close: string };
  autoIncrementKeyword: string;
  supportsIdentity: boolean;
  supportsArrays: boolean;
  types: DriverTypeSpec[];
  typeMap: Map<string, DriverTypeSpec>;
}

function buildTypeMap(types: DriverTypeSpec[]): Map<string, DriverTypeSpec> {
  const map = new Map<string, DriverTypeSpec>();
  for (const t of types) {
    map.set(t.name.toLowerCase(), t);
    if (t.label) map.set(t.label.toLowerCase(), t);
  }
  return map;
}

export function makeConfig(
  id: Driver,
  label: string,
  quote: { open: string; close: string },
  autoIncrementKeyword: string,
  supportsIdentity: boolean,
  supportsArrays: boolean,
  types: DriverTypeSpec[],
): DriverConfig {
  return {
    id,
    label,
    quote,
    autoIncrementKeyword,
    supportsIdentity,
    supportsArrays,
    types,
    typeMap: buildTypeMap(types),
  };
}

export const DRIVERS: DriverConfig[] = [];
export const DRIVER_MAP = new Map<Driver, DriverConfig>();

export function registerDriver(config: DriverConfig) {
  DRIVERS.push(config);
  DRIVER_MAP.set(config.id, config);
}

export function getDriver(driver: Driver): DriverConfig {
  const config = DRIVER_MAP.get(driver);
  if (!config) throw new Error(`Unknown driver: ${driver}`);
  return config;
}

/** quote an identifier for the given driver */
export function quoteIdent(driver: Driver, name: string): string {
  const { quote } = getDriver(driver);
  return `${quote.open}${name}${quote.close}`;
}
