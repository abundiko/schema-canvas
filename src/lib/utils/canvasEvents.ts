export type CanvasEvent =
  | { type: "fit-to-node"; nodeId: string }
  | { type: "fit-view" }
  | { type: "zoom-in" }
  | { type: "zoom-out" }
  | { type: "zoom-reset" }
  | { type: "toggle-fullscreen" };

const listeners = new Set<(e: CanvasEvent) => void>();

export function onCanvasEvent(fn: (e: CanvasEvent) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitCanvasEvent(e: CanvasEvent): void {
  for (const fn of listeners) fn(e);
}
