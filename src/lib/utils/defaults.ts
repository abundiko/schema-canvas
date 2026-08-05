export type DefaultKind = "function" | "number" | "string";

export interface ClassifiedDefault {
  raw: string;
  kind: DefaultKind;
}

/**
 * Classify a default-value string:
 *  - wrapped in quotes  -> string (single quotes force string interpretation)
 *  - numeric literal    -> number
 *  - otherwise          -> function (emitted unquoted)
 */
export function classifyDefault(raw: string): ClassifiedDefault {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { raw, kind: "function" };
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    const inner =
      trimmed.length >= 2 ? trimmed.slice(1, -1).replace(/''/g, "'") : "";
    return { raw: inner, kind: "string" };
  }
  if (/^[-+]?\d+(\.\d+)?$/.test(trimmed)) return { raw: trimmed, kind: "number" };
  return { raw: trimmed, kind: "function" };
}

export function formatDefault(raw: string, kind: DefaultKind): string {
  if (kind === "string") return `'${raw.replace(/'/g, "''")}'`;
  return raw;
}
