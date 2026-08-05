import { useEffect, useRef } from "react";
import { GripVertical, Trash2 } from "lucide-react";

import { useDiagramStore } from "#/lib/store/diagramStore";
import { getDriver } from "#/lib/drivers";
import type { Column } from "#/types/diagram";
import { cn } from "#/lib/utils/cn";
import { TypeSelect } from "./TypeSelect";
import { ColumnAttributesPopover } from "./ColumnAttributesPopover";

export function ColumnRow({
  tableId,
  column,
  autoFocus,
  onDragStart,
  onDrop,
  draggable,
}: {
  tableId: string;
  column: Column;
  autoFocus?: boolean;
  onDragStart: () => void;
  onDrop: () => void;
  draggable: boolean;
}) {
  const driver = useDiagramStore((s) => s.diagram.driver);
  const updateColumn = useDiagramStore((s) => s.updateColumn);
  const deleteColumn = useDiagramStore((s) => s.deleteColumn);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [autoFocus]);

  const spec = getDriver(driver).typeMap.get(column.type.toLowerCase());
  const supportsParams = spec?.params === "length" || spec?.params === "precision-scale";

  return (
    <div
      className="group grid grid-cols-[14px_minmax(70px,1.4fr)_minmax(60px,1fr)_16px_72px_20px_18px] items-center gap-1 rounded px-0.5 py-0.5 hover:bg-zinc-50"
      draggable={draggable}
      onDragStart={onDragStart}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <span className="cursor-grab text-text-faint opacity-0 transition-opacity group-hover:opacity-100">
        <GripVertical size={12} />
      </span>

      <input
        ref={nameInputRef}
        value={column.name}
        placeholder="column"
        onChange={(e) => updateColumn(tableId, column.id, { name: e.target.value })}
        className="min-w-0 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs font-medium text-text-primary outline-none hover:border-border focus:border-brand-500"
      />

      <div className="flex items-center gap-0.5">
        <div className="min-w-0 flex-1">
          <TypeSelect
            driver={driver}
            value={column.type}
            onChange={(type) => changeType(column, type)}
          />
        </div>
        {supportsParams && (
          <input
            value={column.typeParams ?? ""}
            placeholder="len"
            title={spec?.params === "precision-scale" ? "precision, scale" : "length"}
            onChange={(e) =>
              updateColumn(tableId, column.id, { typeParams: e.target.value })
            }
            className="w-10 min-w-0 rounded border border-transparent bg-transparent px-1 py-0.5 text-[11px] tabular-nums text-text-muted outline-none hover:border-border focus:border-brand-500"
          />
        )}
      </div>

      <button
        type="button"
        aria-label={column.nullable ? "Nullable" : "Not nullable"}
        title="Toggle nullable"
        onClick={() => updateColumn(tableId, column.id, { nullable: !column.nullable })}
        className={cn(
          "flex h-5 w-4 items-center justify-center rounded text-[11px] font-semibold",
          column.nullable
            ? "bg-zinc-100 text-zinc-400"
            : "bg-brand-100 text-brand-600",
        )}
      >
        {column.nullable ? "?" : "N"}
      </button>

      <select
        aria-label="Key type"
        value={column.keyType}
        onChange={(e) =>
          updateColumn(tableId, column.id, {
            keyType: e.target.value as Column["keyType"],
          })
        }
        className="h-6 w-full rounded border border-transparent bg-transparent px-1 text-[11px] text-text-muted outline-none hover:border-border focus:border-brand-500"
      >
        <option value="none">none</option>
        <option value="primary">PK</option>
        <option value="unique">UQ</option>
        <option value="index">IX</option>
      </select>

      <ColumnAttributesPopover
        column={column}
        onChange={(patch) => updateColumn(tableId, column.id, patch)}
      />

      <button
        type="button"
        aria-label="Delete column"
        title="Delete column"
        onClick={() => deleteColumn(tableId, column.id)}
        className="flex h-6 w-4 items-center justify-center text-text-faint opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );

  function changeType(col: Column, type: string) {
    const spec = getDriver(driver).typeMap.get(type.toLowerCase());
    const patch: Partial<Column> = { type };
    if (!spec) {
      updateColumn(tableId, col.id, patch);
      return;
    }
    if (spec.params !== "length" && spec.params !== "precision-scale") {
      patch.typeParams = undefined;
    }
    if (!spec.supportsArray) patch.isArray = false;
    if (!spec.supportsEnum) patch.enumValues = undefined;
    if (!spec.supportsSet) patch.setValues = undefined;
    if (!spec.supportsAutoIncrement) patch.autoIncrement = false;
    if (!spec.supportsUnsigned) patch.unsigned = false;
    if (!spec.supportsIdentity) patch.identity = undefined;
    updateColumn(tableId, col.id, patch);
  }
}
