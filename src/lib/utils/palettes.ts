export const TABLE_SWATCHES = [
  "#f87171", // red
  "#fb923c", // orange
  "#fbbf24", // amber
  "#fde047", // yellow
  "#a3e635", // lime
  "#4ade80", // green
  "#2dd4bf", // teal
  "#22d3ee", // cyan
  "#60a5fa", // blue
  "#818cf8", // indigo
  "#a78bfa", // violet
  "#f472b6", // pink
] as const;

export const NOTE_SWATCHES = [
  "#fef3c7", // warm yellow (default)
  "#fde68a",
  "#fed7aa",
  "#fecaca",
  "#fbcfe8",
  "#ddd6fe",
  "#bae6fd",
  "#bbf7d0",
] as const;

export const DEFAULT_TABLE_COLOR = "#fda4af";

/**
 * Pick a random table color from TABLE_SWATCHES, optionally avoiding a specific color.
 */
export function getRandomTableColor(avoidColor?: string): string {
  const candidates = avoidColor
    ? TABLE_SWATCHES.filter((c) => c !== avoidColor)
    : TABLE_SWATCHES;
  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx];
}

/**
 * Generate an array of random table colors of length `count`.
 * Shuffles TABLE_SWATCHES so adjacent tables receive different colors,
 * providing visual distinction across imported tables.
 */
export function getRandomTableColors(count: number): string[] {
  if (count <= 0) return [];
  const result: string[] = [];
  while (result.length < count) {
    const shuffled = [...TABLE_SWATCHES].sort(() => Math.random() - 0.5);
    if (result.length > 0 && shuffled[0] === result[result.length - 1]) {
      const alt = shuffled.pop()!;
      shuffled.unshift(alt);
    }
    result.push(...shuffled);
  }
  return result.slice(0, count);
}

/**
 * Ensure imported tables have distinct colors.
 *
 * Import formats that carry no color information (DDL, most JSON exports) or
 * that assign the same color to every table get random colors instead. Tables
 * with varied, valid colors keep them.
 */
export function normalizeImportedTableColors<T extends { color?: string }>(
  tables: T[],
): T[] {
  if (tables.length === 0) return tables;

  const colors = tables.map((t) => t.color?.trim() ?? "");
  const missingColor = colors.some((c) => c.length === 0);
  const allSameColor =
    !missingColor &&
    tables.length > 1 &&
    colors.every((c) => c.toLowerCase() === colors[0].toLowerCase());

  if (!missingColor && !allSameColor) return tables;

  const randomColors = getRandomTableColors(tables.length);
  return tables.map((table, i) => {
    if (colors[i] && !allSameColor) return table;
    return { ...table, color: randomColors[i] };
  });
}

export const NOTE_FONT_SIZES = {
  S: 16,
  M: 18,
  L: 20,
  XL: 22,
} as const;
