import type { Diagram, TableEntity } from "#/types/diagram";

export type LayoutMode = "grid" | "force";

/** Horizontal gap between table columns in the grid. */
const GAP_X = 80;
/** Vertical gap between table rows in the grid. */
const GAP_Y = 40;
/** Fixed table node width (matches w-[240px] in TableNode). */
const TABLE_W = 240;
/** Table header height (h-8 = 32px). */
const HEADER_H = 32;
/** Per-column row height (h-[26px]). */
const COL_ROW_H = 26;
/** Composite-index section vertical padding. */
const INDEX_SECTION_PAD = 12; // py-1.5 top+bottom
/** Per composite-index row height. */
const INDEX_ROW_H = 18;
/** Border + rounding overhead. */
const BORDER_EXTRA = 2;

/** Estimate the rendered pixel height of a table node. */
function tableHeight(t: TableEntity): number {
  let h = HEADER_H + t.columns.length * COL_ROW_H + BORDER_EXTRA;
  if (t.indexes.length > 0) {
    h += INDEX_SECTION_PAD + t.indexes.length * INDEX_ROW_H;
  }
  return h;
}

function gridPositions(diagram: Diagram): Map<string, { x: number; y: number }> {
  const tables = [...diagram.tables].sort((a, b) => a.name.localeCompare(b.name));
  const n = tables.length;
  if (n === 0) return new Map();

  const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
  const cellW = TABLE_W + GAP_X;

  // Split tables into rows so we can compute per-row max height.
  const rows: TableEntity[][] = [];
  for (let i = 0; i < n; i += cols) {
    rows.push(tables.slice(i, i + cols));
  }

  const positions = new Map<string, { x: number; y: number }>();
  let y = 0;

  for (const row of rows) {
    let maxH = 0;
    for (let c = 0; c < row.length; c++) {
      const t = row[c];
      const h = tableHeight(t);
      if (h > maxH) maxH = h;
      positions.set(t.id, { x: c * cellW, y });
    }
    y += maxH + GAP_Y;
  }

  return positions;
}

function forcePositions(diagram: Diagram): Map<string, { x: number; y: number }> {
  const tables = diagram.tables;
  const n = tables.length;
  if (n === 0) return new Map();

  const pos = new Map<string, { x: number; y: number }>();
  const seed = gridPositions(diagram);
  for (const t of tables) {
    pos.set(t.id, { ...(seed.get(t.id) ?? { x: t.position.x, y: t.position.y }) });
  }

  const edges = diagram.relationships.map((r) => ({
    a: r.sourceTableId,
    b: r.targetTableId,
  }));

  const k = 220;
  const rest = 200;
  const iterations = 80;

  for (let iter = 0; iter < iterations; iter += 1) {
    const forces = new Map<string, { x: number; y: number }>();
    for (const t of tables) forces.set(t.id, { x: 0, y: 0 });

    // repulsion
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const a = tables[i].id;
        const b = tables[j].id;
        const pa = pos.get(a)!;
        const pb = pos.get(b)!;
        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const f = (k * k) / dist;
        const fx = (dx / dist) * f;
        const fy = (dy / dist) * f;
        forces.get(a)!.x -= fx;
        forces.get(a)!.y -= fy;
        forces.get(b)!.x += fx;
        forces.get(b)!.y += fy;
      }
    }

    // springs
    for (const { a, b } of edges) {
      if (!pos.has(a) || !pos.has(b)) continue;
      const pa = pos.get(a)!;
      const pb = pos.get(b)!;
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const f = (dist - rest) * 0.12;
      const fx = (dx / dist) * f;
      const fy = (dy / dist) * f;
      forces.get(a)!.x += fx;
      forces.get(a)!.y += fy;
      forces.get(b)!.x -= fx;
      forces.get(b)!.y -= fy;
    }

    const cooling = 1 - iter / iterations;
    for (const t of tables) {
      const f = forces.get(t.id)!;
      const p = pos.get(t.id)!;
      p.x += f.x * 0.06 * cooling;
      p.y += f.y * 0.06 * cooling;
    }
  }

  // normalize so the min coordinate is 0
  let minX = Infinity;
  let minY = Infinity;
  for (const p of pos.values()) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
  }
  for (const p of pos.values()) {
    p.x -= minX;
    p.y -= minY;
  }
  return pos;
}

export function layoutDiagram(
  diagram: Diagram,
  mode: LayoutMode,
): Map<string, { x: number; y: number }> {
  return mode === "grid" ? gridPositions(diagram) : forcePositions(diagram);
}
