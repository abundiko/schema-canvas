import { useEffect, useState } from "react";
import {
  Frame,
  Fullscreen,
  Grid3x3,
  Hand,
  LayoutGrid,
  Maximize,
  MousePointer2,
  MoreHorizontal,
  Redo2,
  Shuffle,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { useDiagramStore } from "#/lib/store/diagramStore";
import { useUiStore } from "#/lib/store/uiStore";
import { emitCanvasEvent } from "#/lib/utils/canvasEvents";
import { Dropdown, IconButton, MenuItem } from "#/components/ui";
import { cn } from "#/lib/utils/cn";

export function ViewportToolbar() {
  const activeTool = useDiagramStore((s) => s.activeTool);
  const setActiveTool = useDiagramStore((s) => s.setActiveTool);
  const arrangeTables = useDiagramStore((s) => s.arrangeTables);
  const gridVisible = useUiStore((s) => s.gridVisible);
  const setGridVisible = useUiStore((s) => s.setGridVisible);

  const [, forceTick] = useState(0);
  useEffect(() => {
    return useDiagramStore.subscribe((s, p) => {
      if (s.diagram !== p.diagram) forceTick((t) => t + 1);
    });
  }, []);

  const temporal = useDiagramStore.temporal;
  const canUndo = temporal.getState().pastStates.length > 0;
  const canRedo = temporal.getState().futureStates.length > 0;

  return (
    <div className="pointer-events-none absolute bottom-3 right-3 z-20 flex items-center gap-1.5">
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-border bg-white p-1 shadow-floating dark:bg-zinc-900">
        <IconButton
          label="Select tool"
          active={activeTool === "select"}
          onClick={() => setActiveTool("select")}
        >
          <MousePointer2 size={15} />
        </IconButton>
        <IconButton
          label="Pan tool"
          active={activeTool === "pan"}
          onClick={() => setActiveTool(activeTool === "pan" ? "select" : "pan")}
        >
          <Hand size={15} />
        </IconButton>
        <div className="mx-0.5 h-4 w-px bg-border" />
        <IconButton label="Fit view" onClick={() => emitCanvasEvent({ type: "fit-view" })}>
          <Frame size={15} />
        </IconButton>
        <IconButton
          label="Arrange tables (grid)"
          onClick={() => arrangeTables("grid")}
        >
          <LayoutGrid size={15} />
        </IconButton>
        <IconButton
          label="Undo (Ctrl+Z)"
          onClick={() => temporal.getState().undo()}
          disabled={!canUndo}
        >
          <Undo2 size={15} />
        </IconButton>
        <IconButton
          label="Redo (Ctrl+Shift+Z)"
          onClick={() => temporal.getState().redo()}
          disabled={!canRedo}
        >
          <Redo2 size={15} />
        </IconButton>
        <div className="mx-0.5 h-4 w-px bg-border" />
        <IconButton label="Zoom out (-)" onClick={() => emitCanvasEvent({ type: "zoom-out" })}>
          <ZoomOut size={15} />
        </IconButton>
        <ZoomPercent />
        <IconButton label="Zoom in (+)" onClick={() => emitCanvasEvent({ type: "zoom-in" })}>
          <ZoomIn size={15} />
        </IconButton>
        <div className="mx-0.5 h-4 w-px bg-border" />
        <Dropdown
          align="right"
          width="w-48"
          trigger={({ toggle }) => (
            <IconButton label="More options" onClick={toggle}>
              <MoreHorizontal size={15} />
            </IconButton>
          )}
        >
          {({ close }) => (
            <>
              <MenuItem
                onClick={() => {
                  setGridVisible(!gridVisible);
                  close();
                }}
              >
                <span className="flex w-full items-center gap-2">
                  <Grid3x3 size={14} />
                  Grid
                  <span
                    className={cn(
                      "ml-auto text-[10px]",
                      gridVisible ? "text-brand-500" : "text-text-faint",
                    )}
                  >
                    {gridVisible ? "on" : "off"}
                  </span>
                </span>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  arrangeTables("force");
                  close();
                }}
              >
                <Shuffle size={14} /> Arrange (force)
              </MenuItem>
              <MenuItem
                onClick={() => {
                  emitCanvasEvent({ type: "toggle-fullscreen" });
                  close();
                }}
              >
                <Maximize size={14} /> Fullscreen
              </MenuItem>
            </>
          )}
        </Dropdown>
        <IconButton
          label="Fullscreen"
          onClick={() => emitCanvasEvent({ type: "toggle-fullscreen" })}
        >
          <Fullscreen size={15} />
        </IconButton>
      </div>
    </div>
  );
}

function ZoomPercent() {
  const zoom = useUiStore((s) => s.zoom);
  return (
    <button
      type="button"
      title="Reset zoom to 100%"
      onClick={() => emitCanvasEvent({ type: "zoom-reset" })}
      className="h-7 min-w-11 rounded-md px-1 text-center text-[11px] font-medium tabular-nums text-text-muted hover:bg-zinc-100 hover:text-text-primary dark:hover:bg-zinc-800"
    >
      {Math.round(zoom * 100)}%
    </button>
  );
}
