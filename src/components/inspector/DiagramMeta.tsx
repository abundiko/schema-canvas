import { useDiagramStore } from "#/lib/store/diagramStore";

export function DiagramMeta() {
  const description = useDiagramStore((s) => s.diagram.description ?? "");
  const setDescription = useDiagramStore((s) => s.setDiagramDescription);

  return (
    <div className="border-b border-border px-3 pb-2 pt-3">
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        placeholder="Diagram description… (saved with the diagram)"
        className="w-full resize-none rounded-md border border-border bg-white px-2 py-1.5 text-xs leading-relaxed text-text-primary outline-none placeholder:text-text-faint focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:bg-zinc-900"
      />
    </div>
  );
}
