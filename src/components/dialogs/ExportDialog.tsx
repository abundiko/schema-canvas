import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";

import { useDiagramStore } from "#/lib/store/diagramStore";
import { generateDdl, type DdlOptions } from "#/lib/ddl/generateDdl";
import { generateTsTypes } from "#/lib/export/exportTs";
import { generateMongoJson } from "#/lib/export/exportMongo";
import { exportSql, exportTs, exportMongoSchema, exportImage, exportDiagramJson } from "#/lib/export/exportActions";
import { getDriver } from "#/lib/drivers";
import { Button, Modal } from "#/components/ui";
import { useUiStore } from "#/lib/store/uiStore";
import { cn } from "#/lib/utils/cn";

const SQL_OPTIONS: Array<{ key: keyof DdlOptions; label: string }> = [
  { key: "dropTable", label: "Add DROP TABLE IF EXISTS" },
  { key: "ifNotExists", label: "CREATE TABLE IF NOT EXISTS" },
  { key: "mysqlEngine", label: "InnoDB engine (MySQL / MariaDB)" },
];

export function ExportDialog() {
  const open = useUiStore((s) => s.dialog === "export");
  const closeDialog = useUiStore((s) => s.closeDialog);
  const diagram = useDiagramStore((s) => s.diagram);
  const [copied, setCopied] = useState(false);
  const [opts, setOpts] = useState<DdlOptions>({});

  const isMongo = diagram.driver === "mongodb";
  const [tab, setTab] = useState<"sql" | "ts" | "mongo">(isMongo ? "mongo" : "sql");

  if (!open) return null;

  const sql = generateDdl(diagram, opts);
  const ts = generateTsTypes(diagram);
  const mongoJson = generateMongoJson(diagram);
  const driverLabel = getDriver(diagram.driver).label;

  const previewText = tab === "sql" ? sql : tab === "ts" ? ts : mongoJson;
  const previewTitle =
    tab === "sql"
      ? "Generated DDL preview"
      : tab === "ts"
        ? "Generated TypeScript types"
        : "MongoDB JSON schema";

  const copy = async () => {
    await navigator.clipboard.writeText(previewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const tabs: Array<"sql" | "ts" | "mongo"> = isMongo
    ? ["mongo", "ts"]
    : ["sql", "ts"];

  return (
    <Modal title="Export" onClose={closeDialog} width="max-w-2xl">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {isMongo ? (
            <Button variant="primary" onClick={() => exportMongoSchema(diagram)}>
              <Download size={14} /> Download MongoDB schema (.json)
            </Button>
          ) : (
            <Button variant="primary" onClick={() => exportSql(diagram, opts)}>
              <Download size={14} /> Download .sql ({driverLabel})
            </Button>
          )}
          <Button variant="subtle" onClick={() => exportTs(diagram)}>
            <Download size={14} /> Download types.ts
          </Button>
          <Button variant="subtle" onClick={() => void exportImage(diagram)}>
            <Download size={14} /> Download image (PNG)
          </Button>
          <Button variant="subtle" onClick={() => exportDiagramJson(diagram)}>
            <Download size={14} /> Download JSON
          </Button>
        </div>

        {tab === "sql" && !isMongo && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-md border border-border bg-zinc-50 p-2.5 dark:bg-zinc-800/60">
            <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
              SQL options
            </span>
            {SQL_OPTIONS.map((opt) => {
              const active = Boolean(opts[opt.key]);
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() =>
                    setOpts((prev) => ({ ...prev, [opt.key]: !prev[opt.key] }))
                  }
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                    active
                      ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-400"
                      : "border-border text-text-muted hover:border-brand-300 hover:text-text-primary",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      active ? "bg-brand-500" : "bg-text-faint",
                    )}
                  />
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                tab === t
                  ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                  : "text-text-muted hover:bg-zinc-50 dark:hover:bg-zinc-800",
              )}
            >
              {t === "sql" ? "SQL" : t === "ts" ? "TypeScript" : "MongoDB JSON"}
            </button>
          ))}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
              {previewTitle}
            </span>
            <Button variant="ghost" onClick={() => void copy()} className="!h-6 !px-2 text-xs">
              {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <pre className="scrollbar-thin max-h-72 overflow-auto rounded-md border border-border bg-zinc-50 p-3 font-mono text-[11px] leading-relaxed text-text-primary dark:bg-zinc-800/60">
            {previewText}
          </pre>
        </div>
      </div>
    </Modal>
  );
}
