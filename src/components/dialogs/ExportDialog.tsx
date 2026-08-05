import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";

import { useDiagramStore } from "#/lib/store/diagramStore";
import { generateDdl } from "#/lib/ddl/generateDdl";
import { exportSql, exportImage, exportDiagramJson } from "#/lib/export/exportActions";
import { getDriver } from "#/lib/drivers";
import { Button, Modal } from "#/components/ui";
import { useUiStore } from "#/lib/store/uiStore";

export function ExportDialog() {
  const open = useUiStore((s) => s.dialog === "export");
  const closeDialog = useUiStore((s) => s.closeDialog);
  const diagram = useDiagramStore((s) => s.diagram);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const sql = generateDdl(diagram);
  const driverLabel = getDriver(diagram.driver).label;

  const copy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Modal title="Export" onClose={closeDialog} width="max-w-2xl">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => exportSql(diagram)}>
            <Download size={14} /> Download .sql ({driverLabel})
          </Button>
          <Button variant="subtle" onClick={() => void exportImage(diagram)}>
            <Download size={14} /> Download image (PNG)
          </Button>
          <Button variant="subtle" onClick={() => exportDiagramJson(diagram)}>
            <Download size={14} /> Download JSON
          </Button>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
              Generated DDL preview
            </span>
            <Button variant="ghost" onClick={() => void copy()} className="!h-6 !px-2 text-xs">
              {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <pre className="scrollbar-thin max-h-72 overflow-auto rounded-md border border-border bg-zinc-50 p-3 font-mono text-[11px] leading-relaxed text-text-primary">
            {sql}
          </pre>
        </div>
      </div>
    </Modal>
  );
}
