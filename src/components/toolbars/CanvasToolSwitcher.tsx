import { ChevronLeft, ChevronRight, MousePointer2, StickyNote, Table2, FolderPlus } from "lucide-react";

import { useDiagramStore } from "#/lib/store/diagramStore";
import { IconButton } from "#/components/ui";

export function CanvasToolSwitcher() {
  const activeTool = useDiagramStore((s) => s.activeTool);
  const setActiveTool = useDiagramStore((s) => s.setActiveTool);
  const panelCollapsed = useDiagramStore((s) => s.panelCollapsed);
  const setPanelCollapsed = useDiagramStore((s) => s.setPanelCollapsed);

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-1.5">
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-border bg-white p-1 shadow-floating dark:bg-zinc-900">
        <IconButton
          label="Toggle left panel"
          onClick={() => setPanelCollapsed(!panelCollapsed)}
        >
          {panelCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </IconButton>
        <div className="mx-0.5 h-4 w-px bg-border" />
        <IconButton
          label="Select tool"
          active={activeTool === "select"}
          onClick={() => setActiveTool("select")}
        >
          <MousePointer2 size={15} />
        </IconButton>
        <IconButton
          label="Add table (T)"
          active={activeTool === "table"}
          onClick={() => setActiveTool(activeTool === "table" ? "select" : "table")}
        >
          <Table2 size={15} />
        </IconButton>
        <IconButton
          label="Add group"
          active={activeTool === "group"}
          onClick={() => setActiveTool(activeTool === "group" ? "select" : "group")}
        >
          <FolderPlus size={15} />
        </IconButton>
        <IconButton
          label="Add sticky note (N)"
          active={activeTool === "note"}
          onClick={() => setActiveTool(activeTool === "note" ? "select" : "note")}
        >
          <StickyNote size={15} />
        </IconButton>
      </div>
    </div>
  );
}
