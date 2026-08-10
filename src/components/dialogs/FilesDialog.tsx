import { useMemo } from "react";
import { Database, FileText, Trash2 } from "lucide-react";

import { useDiagramStore } from "#/lib/store/diagramStore";
import { useUiStore } from "#/lib/store/uiStore";
import { getDriver } from "#/lib/drivers/driverConfig";
import { Modal } from "#/components/ui";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function FilesDialog() {
  const open = useUiStore((s) => s.dialog === "files");
  const closeDialog = useUiStore((s) => s.closeDialog);
  const showNotice = useUiStore((s) => s.showNotice);
  const files = useDiagramStore((s) => s.files);
  const tabs = useDiagramStore((s) => s.tabs);
  const openDiagram = useDiagramStore((s) => s.openDiagram);
  const deleteFile = useDiagramStore((s) => s.deleteFile);

  const openTabIds = useMemo(() => new Set(tabs.map((t) => t.id)), [tabs]);
  const sorted = useMemo(
    () =>
      [...files].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [files],
  );

  if (!open) return null;

  const openFile = (id: string) => {
    const file = files.find((f) => f.id === id);
    if (!file) return;
    openDiagram(file);
    closeDialog();
  };

  const removeFile = (id: string, name: string) => {
    deleteFile(id);
    showNotice(`Removed "${name}" from your files.`);
  };

  return (
    <Modal title="My files" onClose={closeDialog} width="max-w-xl">
      {sorted.length === 0 ? (
        <p className="py-8 text-center text-xs text-text-faint">
          No files yet. Diagrams you open or create are listed here so you can
          always get back to them.
        </p>
      ) : (
        <ul className="scrollbar-thin -mx-1 max-h-[50vh] space-y-1 overflow-y-auto px-1">
          {sorted.map((f) => {
            const isOpen = openTabIds.has(f.id);
            const tableCount = f.tables.length;
            return (
              <li
                key={f.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-white px-3 py-2 dark:bg-zinc-900"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                  <Database size={15} />
                </span>
                <button
                  type="button"
                  onClick={() => openFile(f.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-sm font-medium text-text-primary">
                    {f.name}
                  </span>
                  <span className="flex items-center gap-2 text-[11px] text-text-muted">
                    <span>{tableCount} table{tableCount === 1 ? "" : "s"}</span>
                    <span>·</span>
                    <span>{getDriver(f.driver).label}</span>
                    <span>·</span>
                    <span>{formatDate(f.updatedAt)}</span>
                    {isOpen && (
                      <span className="text-brand-500">· open</span>
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${f.name}`}
                  title="Delete file"
                  onClick={() => removeFile(f.id, f.name)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-faint transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-3 flex items-start gap-2 rounded-md bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
        <FileText size={14} className="mt-0.5 shrink-0 text-text-faint" />
        <p className="text-[11px] leading-relaxed text-text-muted">
          Files are saved in this browser. Closing a tab keeps the file here so
          you can reopen it anytime.
        </p>
      </div>
    </Modal>
  );
}
