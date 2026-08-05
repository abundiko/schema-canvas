import { Trash2 } from "lucide-react";

import { useDiagramStore } from "#/lib/store/diagramStore";
import type { CompositeIndex, TableEntity } from "#/types/diagram";
import { sortedColumns } from "#/lib/store/selectors";
import { cn } from "#/lib/utils/cn";

export function CompositeIndexRow({
  table,
  index,
  draggable,
  onDragStart,
  onDrop,
}: {
  table: TableEntity;
  index: CompositeIndex;
  draggable: boolean;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  const updateCompositeIndex = useDiagramStore((s) => s.updateCompositeIndex);
  const deleteCompositeIndex = useDiagramStore((s) => s.deleteCompositeIndex);

  return (
    <div
      className="group flex items-center gap-1 rounded px-0.5 py-1 hover:bg-zinc-50"
      draggable={draggable}
      onDragStart={onDragStart}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <span className="cursor-grab text-text-faint opacity-0 transition-opacity group-hover:opacity-100">
        ⠿
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
        {sortedColumns(table).map((col) => {
          const checked = index.columnIds.includes(col.id);
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => {
                const ids = checked
                  ? index.columnIds.filter((id) => id !== col.id)
                  : [...index.columnIds, col.id];
                updateCompositeIndex(table.id, index.id, { columnIds: ids });
              }}
              className={cn(
                "rounded border px-1.5 py-0.5 text-[10px] transition-colors",
                checked
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : "border-border text-text-muted hover:border-zinc-300",
              )}
              title="Toggle column in index"
            >
              {col.name || "…"}
            </button>
          );
        })}
        {index.columnIds.length === 0 && (
          <span className="px-1 text-[10px] italic text-text-faint">
            select 2+ columns
          </span>
        )}
      </div>

      <select
        aria-label="Index type"
        value={index.type}
        onChange={(e) =>
          updateCompositeIndex(table.id, index.id, {
            type: e.target.value as CompositeIndex["type"],
          })
        }
        className="h-6 w-16 rounded border border-transparent bg-transparent px-1 text-[11px] text-text-muted outline-none hover:border-border"
      >
        <option value="index">Index</option>
        <option value="unique">Unique</option>
        <option value="primary">Primary</option>
      </select>

      <button
        type="button"
        aria-label="Delete index"
        onClick={() => deleteCompositeIndex(table.id, index.id)}
        className="flex h-6 w-5 items-center justify-center text-text-faint opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
