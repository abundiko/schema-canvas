import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { useDiagramStore } from "#/lib/store/diagramStore";
import type { TableEntity } from "#/types/diagram";
import { sortedColumns, sortedIndexes } from "#/lib/store/selectors";
import { TABLE_SWATCHES } from "#/lib/utils/palettes";
import { Button, Field, SwatchPicker, TextInput } from "#/components/ui";
import { ColumnRow } from "./ColumnRow";
import { CompositeIndexRow } from "./CompositeIndexRow";

export function TableEditor({ table }: { table: TableEntity }) {
  const updateTable = useDiagramStore((s) => s.updateTable);
  const deleteTable = useDiagramStore((s) => s.deleteTable);
  const addColumn = useDiagramStore((s) => s.addColumn);
  const addCompositeIndex = useDiagramStore((s) => s.addCompositeIndex);
  const reorderColumn = useDiagramStore((s) => s.reorderColumn);
  const reorderCompositeIndex = useDiagramStore((s) => s.reorderCompositeIndex);

  const columns = sortedColumns(table);
  const indexes = sortedIndexes(table);
  const dragColumnId = useRef<string | null>(null);
  const dragIndexId = useRef<string | null>(null);
  const [focusColumnId, setFocusColumnId] = useState<string | null>(null);

  const handleAddColumn = () => {
    const id = addColumn(table.id);
    setFocusColumnId(id);
  };

  return (
    <div className="space-y-4">
      <Field label="Table name">
        <TextInput
          value={table.name}
          onChange={(v) => updateTable(table.id, { name: v })}
          autoFocus
        />
      </Field>

      {/* columns */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
            Columns
          </span>
          <Button variant="ghost" onClick={handleAddColumn} className="!h-6 !px-1.5 text-xs text-accent-teal hover:!text-teal-600">
            <Plus size={12} /> Add column
          </Button>
        </div>
        <div className="space-y-0.5">
          {columns.map((col, i) => (
            <ColumnRow
              key={col.id}
              tableId={table.id}
              column={col}
              autoFocus={col.id === focusColumnId}
              draggable
              onDragStart={() => (dragColumnId.current = col.id)}
              onDrop={() => {
                const id = dragColumnId.current;
                dragColumnId.current = null;
                if (id && id !== col.id) reorderColumn(table.id, id, i);
              }}
            />
          ))}
        </div>
      </div>

      {/* composite indexes */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
            Composite indexes
          </span>
          <Button variant="ghost" onClick={() => addCompositeIndex(table.id)} className="!h-6 !px-1.5 text-xs text-accent-teal hover:!text-teal-600">
            <Plus size={12} /> Add index
          </Button>
        </div>
        {indexes.length === 0 ? (
          <p className="text-[11px] text-text-faint">
            Multi-column indexes. Single-column keys are set on the column row.
          </p>
        ) : (
          <div className="space-y-0.5">
            {indexes.map((ix, i) => (
              <CompositeIndexRow
                key={ix.id}
                table={table}
                index={ix}
                draggable
                onDragStart={() => (dragIndexId.current = ix.id)}
                onDrop={() => {
                  const id = dragIndexId.current;
                  dragIndexId.current = null;
                  if (id && id !== ix.id) reorderCompositeIndex(table.id, id, i);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* color */}
      <Field label="Table color">
        <SwatchPicker
          swatches={TABLE_SWATCHES}
          value={table.color}
          onChange={(color) => updateTable(table.id, { color })}
        />
      </Field>

      {/* comment */}
      <Field label="Comment">
        <TextInput
          value={table.comment ?? ""}
          placeholder="Table comment"
          onChange={(v) => updateTable(table.id, { comment: v || undefined })}
        />
      </Field>

      <Button variant="danger" onClick={() => deleteTable(table.id)} className="w-full">
        <Trash2 size={14} /> Delete table
      </Button>
    </div>
  );
}
