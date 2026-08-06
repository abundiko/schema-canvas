import type { Diagram } from "#/types/diagram";

export type LayoutMode = "grid" | "force";

const GRID_X = 320;
const GRID_Y = 260;

function gridPositions(diagram: Diagram): Map<string, { x: number; y: number }> {
  const tables = [...diagram.tables].sort((a, b) => a.name.localeCompare(b.name));
  const n = tables.length;
  const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
  const positions = new Map<string, { x: number; y: number }>();
  tables.forEach((t, i) => {
    positions.set(t.id, {
      x: (i % cols) * GRID_X,
      y: Math.floor(i / cols) * GRID_Y,
    });
  });
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
