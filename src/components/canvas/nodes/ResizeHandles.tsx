import { useRef } from "react";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN = 120;

type Dir = "bottom" | "right" | "br";

/** Pointer-based resize handles for the bottom / right edges and the corner. */
export function ResizeHandles({
  onLive,
  onEnd,
}: {
  onLive: (rect: Rect) => void;
  onEnd: (rect: Rect) => void;
}) {
  const startRef = useRef<{ rect: Rect; x: number; y: number } | null>(null);

  const begin = (dir: Dir) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const base = e.currentTarget as HTMLElement;
    const parent = base.parentElement;
    if (!parent) return;
    const w = parent.offsetWidth;
    const h = parent.offsetHeight;
    const rect = { x: 0, y: 0, width: w, height: h };
    startRef.current = { rect, x: e.clientX, y: e.clientY };

    const onMove = (ev: PointerEvent) => {
      if (!startRef.current) return;
      const dx = ev.clientX - startRef.current.x;
      const dy = ev.clientY - startRef.current.y;
      const r = startRef.current.rect;
      const next: Rect = { ...r };
      if (dir === "bottom") next.height = Math.max(MIN, r.height + dy);
      if (dir === "right") next.width = Math.max(MIN, r.width + dx);
      if (dir === "br") {
        next.width = Math.max(MIN, r.width + dx);
        next.height = Math.max(MIN, r.height + dy);
      }
      onLive(next);
    };

    const onUp = () => {
      if (!startRef.current) return;
      const r = startRef.current.rect;
      startRef.current = null;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      onEnd(r);
    };

    base.setPointerCapture(e.pointerId);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  return (
    <>
      <div
        className="absolute bottom-0 left-1 right-1 h-1.5 cursor-s-resize"
        onPointerDown={begin("bottom")}
      />
      <div
        className="absolute bottom-1 right-0 top-1 w-1.5 cursor-e-resize"
        onPointerDown={begin("right")}
      />
      <div
        className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize"
        onPointerDown={begin("br")}
      />
    </>
  );
}
