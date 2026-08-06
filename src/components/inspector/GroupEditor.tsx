import { Copy, Trash2, X } from "lucide-react";

import { useDiagramStore } from "#/lib/store/diagramStore";
import type { Group } from "#/types/diagram";
import { TABLE_SWATCHES } from "#/lib/utils/palettes";
import { Button, Field, SwatchPicker, TextInput } from "#/components/ui";

export function GroupEditor({ group }: { group: Group }) {
  const updateGroup = useDiagramStore((s) => s.updateGroup);
  const deleteGroup = useDiagramStore((s) => s.deleteGroup);
  const deleteGroupAll = useDiagramStore((s) => s.deleteGroupAll);
  const duplicateGroup = useDiagramStore((s) => s.duplicateGroup);
  const assignTableToGroup = useDiagramStore((s) => s.assignTableToGroup);
  const tables = useDiagramStore((s) => s.diagram.tables);
  const notes = useDiagramStore((s) => s.diagram.notes);
  const setSelection = useDiagramStore((s) => s.setSelection);

  const members = tables.filter((t) => t.groupId === group.id);
  const memberNotes = notes.filter((n) => n.groupId === group.id);

  return (
    <div className="space-y-4">
      <Field label="Group name">
        <TextInput
          value={group.name}
          onChange={(v) => updateGroup(group.id, { name: v })}
          autoFocus
        />
      </Field>

      <Field label="Group color">
        <SwatchPicker
          swatches={TABLE_SWATCHES}
          value={group.color}
          onChange={(color) => updateGroup(group.id, { color })}
        />
      </Field>

      <div>
        <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-text-muted">
          Members ({members.length + memberNotes.length})
        </span>
        {members.length === 0 && memberNotes.length === 0 ? (
          <p className="text-[11px] text-text-faint">
            Drag tables or notes into the group boundary to add them.
          </p>
        ) : (
          <div className="space-y-0.5">
            {members.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: t.color }}
                />
                <span
                  className="min-w-0 flex-1 cursor-pointer truncate hover:text-brand-600"
                  onClick={() => setSelection({ type: "table", tableId: t.id })}
                >
                  {t.name}
                </span>
                <button
                  type="button"
                  aria-label="Remove from group"
                  title="Remove from group"
                  onClick={() => assignTableToGroup(t.id, null)}
                  className="text-text-faint hover:text-red-500"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {memberNotes.map((n) => (
              <div
                key={n.id}
                className="flex items-center gap-2 rounded px-1.5 py-1 text-xs text-text-muted hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: n.color }}
                />
                <span className="min-w-0 flex-1 truncate">{n.content.slice(0, 30) || "note"}</span>
                <button
                  type="button"
                  aria-label="Remove note from group"
                  onClick={() => {
                    useDiagramStore.getState().updateNote(n.id, { groupId: null });
                  }}
                  className="text-text-faint hover:text-red-500"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <Button variant="subtle" onClick={() => duplicateGroup(group.id)} className="!h-8 !px-2 text-xs" title="Duplicate group and contents">
          <Copy size={12} /> Duplicate
        </Button>
        <Button variant="subtle" onClick={() => deleteGroup(group.id)} className="!h-8 !px-2 text-xs" title="Delete group, keep members">
          <Trash2 size={12} /> Delete
        </Button>
        <Button variant="danger" onClick={() => deleteGroupAll(group.id)} className="!h-8 !px-2 text-xs" title="Delete group and all members">
          Delete all
        </Button>
      </div>
    </div>
  );
}
