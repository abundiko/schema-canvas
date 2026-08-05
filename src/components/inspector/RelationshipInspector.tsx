import { Trash2 } from "lucide-react";

import { useDiagramStore } from "#/lib/store/diagramStore";
import type { Relationship } from "#/types/diagram";
import { Button, Field, Select } from "#/components/ui";

export function RelationshipInspector({ relationship }: { relationship: Relationship }) {
  const updateRelationship = useDiagramStore((s) => s.updateRelationship);
  const deleteRelationship = useDiagramStore((s) => s.deleteRelationship);
  const diagram = useDiagramStore((s) => s.diagram);

  const src = diagram.tables.find((t) => t.id === relationship.sourceTableId);
  const tgt = diagram.tables.find((t) => t.id === relationship.targetTableId);
  const srcCol = src?.columns.find((c) => c.id === relationship.sourceColumnId);
  const tgtCol = tgt?.columns.find((c) => c.id === relationship.targetColumnId);

  return (
    <div className="space-y-4">
      <Field label="Cardinality">
        <Select
          ariaLabel="Cardinality"
          value={relationship.cardinality}
          onChange={(v) =>
            updateRelationship(relationship.id, {
              cardinality: v as Relationship["cardinality"],
            })
          }
          options={[
            { value: "one-to-one", label: "1 — 1 (one to one)" },
            { value: "one-to-many", label: "1 — ∞ (one to many)" },
            { value: "many-to-many", label: "∞ — ∞ (many to many)" },
          ]}
        />
      </Field>

      <div className="rounded-md border border-border bg-zinc-50 p-2 text-xs text-text-muted">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-text-primary">{src?.name ?? "?"}</span>
          <span className="text-brand-500">·</span>
          <span>{srcCol?.name ?? "?"}</span>
        </div>
        <div className="my-1 text-center text-text-faint">── relates to ──</div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-text-primary">{tgt?.name ?? "?"}</span>
          <span className="text-brand-500">·</span>
          <span>{tgtCol?.name ?? "?"}</span>
        </div>
      </div>

      <Button
        variant="danger"
        onClick={() => deleteRelationship(relationship.id)}
        className="w-full"
      >
        <Trash2 size={14} /> Delete relationship
      </Button>
    </div>
  );
}
