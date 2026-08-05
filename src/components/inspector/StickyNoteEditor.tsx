import { useDiagramStore } from "#/lib/store/diagramStore";
import type { StickyNote } from "#/types/diagram";
import { NOTE_SWATCHES } from "#/lib/utils/palettes";
import { Field, Select, SwatchPicker } from "#/components/ui";

export function StickyNoteEditor({ note }: { note: StickyNote }) {
  const updateNote = useDiagramStore((s) => s.updateNote);

  return (
    <div className="space-y-4">
      <Field label="Content">
        <textarea
          value={note.content}
          onChange={(e) => updateNote(note.id, { content: e.target.value })}
          rows={5}
          autoFocus
          className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </Field>

      <Field label="Color">
        <SwatchPicker
          swatches={NOTE_SWATCHES}
          value={note.color}
          onChange={(color) => updateNote(note.id, { color })}
        />
      </Field>

      <Field label="Font size">
        <Select
          ariaLabel="Font size"
          value={note.fontSize}
          onChange={(v) => updateNote(note.id, { fontSize: v as StickyNote["fontSize"] })}
          options={[
            { value: "S", label: "Small (16px)" },
            { value: "M", label: "Medium (18px)" },
            { value: "L", label: "Large (20px)" },
            { value: "XL", label: "Extra large (22px)" },
          ]}
        />
      </Field>
    </div>
  );
}
