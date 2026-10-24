import { useEffect, useRef, useState } from "react";
import { ClipboardPaste, FileJson, FileUp, TriangleAlert } from "lucide-react";

import { useDiagramStore } from "#/lib/store/diagramStore";
import { parseDiagramJson } from "#/lib/export/importJson";
import { createId } from "#/lib/utils/ids";
import { Button, Modal } from "#/components/ui";
import { useUiStore } from "#/lib/store/uiStore";

interface ImportResult {
  name: string;
  tables: number;
  relationships: number;
}

export function ImportJsonDialog() {
  const open = useUiStore((s) => s.dialog === "importJson");
  const closeDialog = useUiStore((s) => s.closeDialog);
  const openDiagram = useDiagramStore((s) => s.openDiagram);
  const fileRef = useRef<HTMLInputElement>(null);

  const [json, setJson] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);

  useEffect(() => {
    if (open) setImported(false);
  }, [open]);

  if (!open) return null;

  const handleFile = async (file: File) => {
    const text = await file.text();
    setJson(text);
    setFileName(file.name);
    setResult(null);
    setError(null);
    setImported(false);
  };

  const runImport = () => {
    if (!json.trim()) {
      setError("Paste diagram JSON or choose a file first.");
      return;
    }
    setError(null);
    setResult(null);

    let diagram;
    try {
      diagram = parseDiagramJson(json);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to parse the diagram JSON.",
      );
      return;
    }

    openDiagram({ ...diagram, id: createId("diag") });
    setResult({
      name: diagram.name,
      tables: diagram.tables.length,
      relationships: diagram.relationships.length,
    });
    setImported(true);
  };

  return (
    <Modal title="Import from JSON" onClose={closeDialog} width="max-w-xl">
      <div className="space-y-4">
        <p className="text-xs text-text-muted">
          Import a diagram exported from Schemiwa. It opens in a new tab and is
          added to your files.
        </p>

        <div className="flex items-center gap-2">
          <Button variant="subtle" onClick={() => fileRef.current?.click()}>
            <FileUp size={14} /> Choose file
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
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
          value={json}
          onChange={(e) => {
            setJson(e.target.value);
            setResult(null);
            setError(null);
            setImported(false);
          }}
          rows={10}
          placeholder={`{\n  "name": "My diagram",\n  "driver": "mysql",\n  "tables": [ ... ],\n  "relationships": [ ... ]\n}`}
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
              Imported “{result.name}” with {result.tables} table
              {result.tables === 1 ? "" : "s"} and {result.relationships}{" "}
              relationship
              {result.relationships === 1 ? "" : "s"}
            </div>
            <div className="flex items-center gap-1.5 text-text-muted">
              <FileJson size={12} /> Opened in a new tab.
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="subtle" onClick={closeDialog}>
            Close
          </Button>
          <Button variant="primary" onClick={runImport} disabled={imported}>
            Import diagram
          </Button>
        </div>
      </div>
    </Modal>
  );
}
