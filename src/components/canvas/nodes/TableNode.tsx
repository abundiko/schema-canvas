import { memo, useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Key, ListOrdered, MessageSquare, Snowflake } from "lucide-react";

import type { TableNode as TableNodeType } from "./types";

function KeyGlyph({ keyType }: { keyType: string }) {
  if (keyType === "primary")
    return (
      <span className="flex items-center text-accent-teal" title="Primary key">
        <Key size={11} strokeWidth={2.5} />
      </span>
    );
  if (keyType === "unique")
    return (
      <span className="flex items-center text-amber-500" title="Unique">
        <Snowflake size={11} strokeWidth={2.5} />
      </span>
    );
  if (keyType === "index")
    return (
      <span className="flex items-center text-zinc-400" title="Index">
        <ListOrdered size={11} strokeWidth={2.5} />
      </span>
    );
  return null;
}

function TableNodeInner({ data }: NodeProps<TableNodeType>) {
  const table = data.table;
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(table.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  useEffect(() => {
    if (data.autoFocusName) {
      setDraftName(table.name);
      setEditing(true);
    }
  }, [data.autoFocusName]);

  const columns = [...table.columns].sort((a, b) => a.order - b.order);
  const indexes = [...table.indexes].sort((a, b) => a.order - b.order);

  const commitName = () => {
    const name = draftName.trim();
    if (name) data.onRename(table.id, name);
    setEditing(false);
  };

  return (
    <div
      className="w-[240px] rounded-lg border border-border bg-white shadow-panel transition-shadow"
      onDoubleClick={() => {
        setDraftName(table.name);
        setEditing(true);
      }}
    >
      {/* header */}
      <div
        className="relative flex h-8 items-center justify-center rounded-t-lg border-b border-black/10 px-2"
        style={{ backgroundColor: table.color }}
      >
        {editing ? (
          <input
            ref={inputRef}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") {
                setDraftName(table.name);
                setEditing(false);
              }
              e.stopPropagation();
            }}
            className="h-5 w-full rounded bg-white/90 px-1 text-center text-xs font-semibold text-text-primary outline-none ring-1 ring-brand-500"
          />
        ) : (
          <span className="flex items-center gap-1 truncate text-xs font-semibold text-white drop-shadow-sm">
            {table.name}
            {table.comment && <MessageSquare size={11} className="shrink-0 opacity-80" />}
          </span>
        )}
      </div>

      {/* columns */}
      <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
        {columns.map((col) => (
          <div
            key={col.id}
            className="group relative flex h-[26px] items-center gap-1 border-b border-border/60 px-2 text-[12px] last:border-b-0 hover:bg-zinc-50"
          >
            <Handle
              type="target"
              position={Position.Left}
              id={`${col.id}`}
              className="!left-[-7px] !top-1/2 !h-2 !w-2 !-translate-y-1/2 !rounded-full !border-2 !border-white !bg-brand-500 !opacity-100"
            />
            <span className="w-3.5 shrink-0">
              <KeyGlyph keyType={col.keyType} />
            </span>
            <span
              className="min-w-0 flex-1 truncate font-medium text-text-primary"
              title={col.name}
            >
              {col.name || <span className="italic text-text-faint">unnamed</span>}
            </span>
            {col.nullable && (
              <span className="shrink-0 text-[10px] text-text-faint" title="Nullable">
                ?
              </span>
            )}
            <span className="shrink-0 text-[11px] tabular-nums text-text-muted">
              {col.type.toUpperCase()}
              {col.isArray ? "[]" : ""}
              {col.typeParams ? `(${col.typeParams})` : ""}
            </span>
            {col.comment && (
              <MessageSquare size={10} className="shrink-0 text-text-faint" />
            )}
            <Handle
              type="source"
              position={Position.Right}
              id={`${col.id}`}
              className="!right-[-7px] !top-1/2 !h-2 !w-2 !-translate-y-1/2 !rounded-full !border-2 !border-white !bg-brand-500 !opacity-100"
            />
          </div>
        ))}
      </div>

      {/* composite indexes */}
      {indexes.length > 0 && (
        <div className="border-t border-border bg-zinc-50/60 px-2 py-1.5">
          {indexes.map((ix) => {
            const names = ix.columnIds
              .map((id) => table.columns.find((c) => c.id === id)?.name)
              .filter(Boolean)
              .join(", ");
            const glyph =
              ix.type === "primary" ? (
                <Key size={10} className="text-accent-teal" />
              ) : ix.type === "unique" ? (
                <Snowflake size={10} className="text-amber-500" />
              ) : (
                <ListOrdered size={10} className="text-zinc-400" />
              );
            return (
              <div
                key={ix.id}
                className="flex items-center gap-1.5 text-[11px] text-text-muted"
              >
                {glyph}
                <span className="truncate">{names}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const TableNode = memo(TableNodeInner);
