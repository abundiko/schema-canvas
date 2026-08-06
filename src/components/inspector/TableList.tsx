import { useState } from "react";
import { FolderPlus, Plus, Search } from "lucide-react";

import { useDiagramStore } from "#/lib/store/diagramStore";
import { emitCanvasEvent } from "#/lib/utils/canvasEvents";
import { Button } from "#/components/ui";
import { cn } from "#/lib/utils/cn";

export function TableList() {
  const tables = useDiagramStore((s) => s.diagram.tables);
  const selection = useDiagramStore((s) => s.selection);
  const setSelection = useDiagramStore((s) => s.setSelection);
  const addTable = useDiagramStore((s) => s.addTable);
  const [query, setQuery] = useState("");

  const filtered = tables.filter((t) =>
    t.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const handleSelect = (id: string) => {
    setSelection({ type: "table", tableId: id });
    emitCanvasEvent({ type: "fit-to-node", nodeId: id });
  };

  const handleCreateGroup = () => {
    const store = useDiagramStore.getState();
    if (selection.type !== "tables" || selection.tableIds.length === 0) return;
    const selected = store.diagram.tables.filter((t) =>
      selection.tableIds.includes(t.id),
    );
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const t of selected) {
      minX = Math.min(minX, t.position.x - 20);
      minY = Math.min(minY, t.position.y - 60);
      maxX = Math.max(maxX, t.position.x + 260);
      maxY = Math.max(maxY, t.position.y + 160);
    }
    const groupId = store.addGroup({
      x: minX,
      y: minY,
      width: Math.max(200, maxX - minX),
      height: Math.max(120, maxY - minY),
    });
    for (const t of selected) store.assignTableToGroup(t.id, groupId);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Tables
        </h2>
        <Button variant="ghost" onClick={() => addTable()} className="!h-6 !px-1.5 text-xs text-accent-teal hover:!text-teal-600">
          <Plus size={12} /> New
        </Button>
      </div>

      {selection.type === "tables" && (
        <div className="mx-3 mb-2 rounded-md border border-brand-200 bg-brand-50 p-2 dark:border-brand-500/30 dark:bg-brand-500/10">
          <p className="text-[11px] text-brand-700 dark:text-brand-400">
            {selection.tableIds.length} tables selected
          </p>
          <Button
            variant="primary"
            onClick={handleCreateGroup}
            className="mt-1.5 !h-7 w-full text-[11px]"
          >
            <FolderPlus size={12} /> Create group
          </Button>
        </div>
      )}

      <div className="px-3 pb-2">
        <div className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-white px-2 dark:bg-zinc-900">
          <Search size={12} className="text-text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tables…"
            className="w-full bg-transparent text-xs outline-none placeholder:text-text-faint"
          />
        </div>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-2 pb-3">
        {filtered.length === 0 && (
          <p className="px-2 py-4 text-center text-[11px] text-text-faint">
            {tables.length === 0 ? "No tables yet. Click “New” or press T." : "No matches."}
          </p>
        )}
        {filtered.map((t) => {
          const active =
            selection.type === "table" && selection.tableId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSelect(t.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800",
                active && "bg-brand-50 text-brand-700 hover:bg-brand-50 dark:bg-brand-500/15 dark:text-brand-400 dark:hover:bg-brand-500/15",
              )}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: t.color }}
              />
              <span className="truncate">{t.name}</span>
              <span className="ml-auto shrink-0 text-[10px] text-text-faint">
                {t.columns.length}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
