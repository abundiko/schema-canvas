import { useRef, useState } from "react";
import { FileUp, TriangleAlert, ClipboardPaste } from "lucide-react";

import { useDiagramStore } from "#/lib/store/diagramStore";
import { parseDdl, detectDriver } from "#/lib/ddl/parseDdl";
import { DRIVERS, type DriverConfig } from "#/lib/drivers";
import type { Driver, TableEntity } from "#/types/diagram";
import { Button, Field, Modal, Select } from "#/components/ui";
import { useUiStore } from "#/lib/store/uiStore";
import { createId } from "#/lib/utils/ids";

type DuplicateMode = "keep-both" | "overwrite";

interface ImportResult {
  tables: number;
  relationships: number;
  warnings: string[];
}

export function ImportDdlDialog() {
  const open = useUiStore((s) => s.dialog === "import");
  const closeDialog = useUiStore((s) => s.closeDialog);
  const setDiagram = useDiagramStore((s) => s.setDiagram);
  const fileRef = useRef<HTMLInputElement>(null);

  const [sql, setSql] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [driver, setDriver] = useState<Driver | "auto">("auto");
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>("keep-both");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleFile = async (file: File) => {
    const text = await file.text();
    setSql(text);
    setFileName(file.name);
    setDriver("auto");
    setResult(null);
    setError(null);
  };

  const runImport = () => {
    if (!sql.trim()) {
      setError("Paste SQL or choose a file first.");
      return;
    }
    setError(null);
    setResult(null);

    const diagram = useDiagramStore.getState().diagram;
    const resolvedDriver: Driver =
      driver === "auto" ? detectDriver(sql) : driver;

    let parsed;
    try {
      parsed = parseDdl(sql, { driver: resolvedDriver });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse SQL.");
      return;
    }

    let tables = [...diagram.tables];
    let relationships = [...diagram.relationships];
    const warnings = [...parsed.warnings];

    let maxX = 100;
    for (const t of tables) maxX = Math.max(maxX, t.position.x + 260);

    const existingNames = new Map(
      tables.map((t) => [t.name.toLowerCase(), t.id]),
    );
    const usedNames = new Set(tables.map((t) => t.name.toLowerCase()));

    const newTables: TableEntity[] = [];
    for (const t of parsed.tables) {
      const existingId = existingNames.get(t.name.toLowerCase());
      let name = t.name;
      if (existingId) {
        if (duplicateMode === "overwrite") {
          const oldId = existingId;
          tables = tables.filter((x) => x.id !== oldId);
          relationships = relationships.filter(
            (r) => r.sourceTableId !== oldId && r.targetTableId !== oldId,
          );
          warnings.push(`Overwrote existing table "${t.name}".`);
        } else {
          let suffix = 2;
          while (usedNames.has(`${t.name}_${suffix}`.toLowerCase())) suffix += 1;
          name = `${t.name}_${suffix}`;
          warnings.push(`Renamed duplicate table "${t.name}" → "${name}".`);
        }
      }
      usedNames.add(name.toLowerCase());
      const col = (tables.length + newTables.length) % 5;
      const row = Math.floor((tables.length + newTables.length) / 5);
      const idMap = new Map<string, string>();
      const columns = t.columns.map((c) => {
        const id = createId("col");
        idMap.set(c.id, id);
        return { ...c, id };
      });
      const indexes = t.indexes.map((ix) => ({
        ...ix,
        id: createId("idx"),
        columnIds: ix.columnIds
          .map((cid) => idMap.get(cid))
          .filter((id): id is string => !!id),
      }));
      newTables.push({
        ...t,
        name,
        id: createId("tbl"),
        position: { x: maxX + col * 280, y: row * 260 + 100 },
        columns,
        indexes,
      });
    }

    // remap parsed relationships onto the new table/column ids
    const relByIndex = new Map<number, number>();
    parsed.tables.forEach((_, i) => {
      const idx = tables.length + i;
      if (idx < tables.length + newTables.length) relByIndex.set(i, idx);
    });
    const newColumnId = (tableIdx: number, oldColId: string): string | null => {
      const newTable = newTables[tableIdx];
      if (!newTable) return null;
      const old = parsed.tables[tableIdx];
      const j = old?.columns.findIndex((c) => c.id === oldColId) ?? -1;
      return j >= 0 ? newTable.columns[j].id : null;
    };
    for (const r of parsed.relationships) {
      const si = parsed.tables.findIndex((t) => t.id === r.sourceTableId);
      const ti = parsed.tables.findIndex((t) => t.id === r.targetTableId);
      const si2 = relByIndex.get(si);
      const ti2 = relByIndex.get(ti);
      if (si2 === undefined || ti2 === undefined) continue;
      const sc = newColumnId(si2, r.sourceColumnId);
      const tc = newColumnId(ti2, r.targetColumnId);
      if (!sc || !tc) continue;
      relationships.push({
        id: createId("rel"),
        sourceTableId: newTables[si2].id,
        sourceColumnId: sc,
        targetTableId: newTables[ti2].id,
        targetColumnId: tc,
        cardinality: r.cardinality,
      });
    }

    tables = [...tables, ...newTables];

    if (tables.length === 0) {
      setError("No CREATE TABLE statements found in the SQL.");
      return;
    }

    const newDiagram = {
      ...diagram,
      id: diagram.id,
      driver: resolvedDriver,
      tables,
      relationships,
      updatedAt: new Date().toISOString(),
    };
    setDiagram(newDiagram);

    setResult({
      tables: newTables.length,
      relationships: relationships.length - diagram.relationships.length,
      warnings,
    });
  };

  return (
    <Modal title="Import from DDL" onClose={closeDialog} width="max-w-xl">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="subtle" onClick={() => fileRef.current?.click()}>
            <FileUp size={14} /> Choose file
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".sql,.txt"
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
          value={sql}
          onChange={(e) => {
            setSql(e.target.value);
            setResult(null);
          }}
          rows={8}
          placeholder="CREATE TABLE `users` ( ... );"
          className="w-full rounded-md border border-border bg-white p-2 font-mono text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:bg-zinc-950"
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Driver">
            <Select
              ariaLabel="Driver"
              value={driver}
              onChange={(v) => setDriver(v as Driver | "auto")}
              options={[
                { value: "auto", label: "Auto-detect" },
                ...DRIVERS.map((d: DriverConfig) => ({
                  value: d.id,
                  label: d.label,
                })),
              ]}
            />
          </Field>
          <Field label="Duplicate table names">
            <Select
              ariaLabel="Duplicate handling"
              value={duplicateMode}
              onChange={(v) => setDuplicateMode(v as DuplicateMode)}
              options={[
                { value: "keep-both", label: "Keep both (rename new)" },
                { value: "overwrite", label: "Overwrite existing" },
              ]}
            />
          </Field>
        </div>

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
            {result.warnings.length > 0 && (
              <div className="max-h-44 overflow-y-auto pr-1">
                <div className="mb-1 text-amber-700 dark:text-amber-400">
                  {result.warnings.length} warning{result.warnings.length === 1 ? "" : "s"}:
                </div>
                {result.warnings.slice(0, 40).map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
                    <span className="mt-0.5 shrink-0">•</span>
                    <span>{w}</span>
                  </div>
                ))}
                {result.warnings.length > 40 && (
                  <div className="mt-1 text-text-muted">
                    …and {result.warnings.length - 40} more
                  </div>
                )}
              </div>
            )}
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
