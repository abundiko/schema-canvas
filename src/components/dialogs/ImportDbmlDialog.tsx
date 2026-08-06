import { useRef, useState } from "react";
import { ClipboardPaste, FileUp, TriangleAlert } from "lucide-react";

import { useDiagramStore } from "#/lib/store/diagramStore";
import { parseDbml } from "#/lib/dbml/parseDbml";
import { Button, Modal } from "#/components/ui";
import { useUiStore } from "#/lib/store/uiStore";

interface ImportResult {
  tables: number;
  relationships: number;
  warnings: string[];
}

export function ImportDbmlDialog() {
  const open = useUiStore((s) => s.dialog === "importDbml");
  const closeDialog = useUiStore((s) => s.closeDialog);
  const setDiagram = useDiagramStore((s) => s.setDiagram);
  const fileRef = useRef<HTMLInputElement>(null);

  const [dbml, setDbml] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleFile = async (file: File) => {
    const text = await file.text();
    setDbml(text);
    setFileName(file.name);
    setResult(null);
    setError(null);
  };

  const runImport = () => {
    if (!dbml.trim()) {
      setError("Paste DBML or choose a file first.");
      return;
    }
    setError(null);
    setResult(null);

    const parsed = parseDbml(dbml);
    if (parsed.tables.length === 0) {
      setError("No Table definitions found in the DBML.");
      return;
    }

    const diagram = useDiagramStore.getState().diagram;
    setDiagram({
      ...diagram,
      driver: parsed.driver,
      tables: parsed.tables,
      relationships: parsed.relationships,
      updatedAt: new Date().toISOString(),
    });

    setResult({
      tables: parsed.tables.length,
      relationships: parsed.relationships.length,
      warnings: parsed.warnings,
    });
  };

  return (
    <Modal title="Import from DBML" onClose={closeDialog} width="max-w-xl">
      <div className="space-y-4">
        <p className="text-xs text-text-muted">
          DBML is the schema format used by dbdiagram.io and other tools. Importing
          replaces the current diagram.
        </p>

        <div className="flex items-center gap-2">
          <Button variant="subtle" onClick={() => fileRef.current?.click()}>
            <FileUp size={14} /> Choose file
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".dbml,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <span className="text-xs text-text-muted">
            {fileName ?? "or paste below"}
          </span>
        </div>

        <textarea
          value={dbml}
          onChange={(e) => {
            setDbml(e.target.value);
            setResult(null);
          }}
          rows={10}
          placeholder={`Table users {\n  id integer [pk, increment]\n  email varchar(255) [not null, unique]\n}\n\nTable posts {\n  id integer [pk]\n  author_id integer\n}\n\nRef: posts.author_id > users.id`}
          className="w-full rounded-md border border-border bg-white p-2 font-mono text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:bg-zinc-950"
        />

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-500/10">
            <TriangleAlert size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="rounded-md border border-border bg-zinc-50 p-3 text-xs dark:bg-zinc-800/60">
            <div className="mb-1 flex items-center gap-1.5 font-medium text-text-primary">
              <ClipboardPaste size={13} className="text-accent-teal" />
              Imported {result.tables} table{result.tables === 1 ? "" : "s"} and{" "}
              {result.relationships} relationship
              {result.relationships === 1 ? "" : "s"}
            </div>
            {result.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="subtle" onClick={closeDialog}>
            Close
          </Button>
          <Button variant="primary" onClick={runImport}>
            Import into diagram
          </Button>
        </div>
      </div>
    </Modal>
  );
}
