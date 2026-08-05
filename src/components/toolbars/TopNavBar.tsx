import { useState } from "react";
import { ChevronDown, Database, FileJson, FileText, Image, Plus, Save } from "lucide-react";

import { useDiagramStore, createBlankDiagram, MAX_TABLES } from "#/lib/store/diagramStore";
import { useUiStore } from "#/lib/store/uiStore";
import { exportSql, exportImage, exportDiagramJson } from "#/lib/export/exportActions";
import { DRIVERS, getDriver } from "#/lib/drivers";
import { saveDiagram } from "#/lib/persistence/autosave";
import { Dropdown, MenuItem } from "#/components/ui";

export function TopNavBar() {
  const diagram = useDiagramStore((s) => s.diagram);
  const setDiagram = useDiagramStore((s) => s.setDiagram);
  const setDriver = useDiagramStore((s) => s.setDriver);
  const openDialog = useUiStore((s) => s.openDialog);
  const showNotice = useUiStore((s) => s.showNotice);
  const [saveOpen, setSaveOpen] = useState(false);

  const currentDriver = DRIVERS.find((d) => d.id === diagram.driver);

  const newDiagram = () => {
    if (
      window.confirm("Start a new diagram? Your current diagram is saved locally.")
    ) {
      setDiagram(createBlankDiagram());
    }
  };

  const saveNow = async () => {
    await saveDiagram(useDiagramStore.getState().diagram);
    showNotice("Diagram saved to this browser.");
  };

  const switchDriver = (id: (typeof DRIVERS)[number]["id"]) => {
    if (id === diagram.driver) return;
    setDriver(id);
    // re-validate existing column types against the new driver
    const { typeMap } = getDriver(id);
    let incompatible = 0;
    for (const t of useDiagramStore.getState().diagram.tables) {
      for (const c of t.columns) {
        if (!typeMap.has(c.type.toLowerCase())) incompatible += 1;
      }
    }
    showNotice(
      incompatible > 0
        ? `Switched to ${id}. ${incompatible} column type(s) are incompatible and will be flagged.`
        : `Switched driver to ${id}.`,
    );
  };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-white px-3">
      <div className="flex items-center gap-1">
        <a href="/" className="mr-1 flex items-center gap-1.5 text-sm font-bold text-text-primary">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-500 text-white">
            <Database size={14} />
          </span>
          SchemaCanvas
        </a>

        <Dropdown
          width="w-44"
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className="flex h-8 items-center gap-1 rounded-md px-2 text-sm text-text-primary hover:bg-zinc-100"
            >
              File <ChevronDown size={13} className="text-text-faint" />
            </button>
          )}
        >
          {({ close }) => (
            <>
              <MenuItem
                onClick={() => {
                  close();
                  newDiagram();
                }}
              >
                <Plus size={14} /> New diagram
              </MenuItem>
              <MenuItem
                onClick={() => {
                  close();
                  openDialog("import");
                }}
              >
                <FileText size={14} /> Import SQL…
              </MenuItem>
              <div className="my-0.5 border-t border-border" />
              <MenuItem
                onClick={() => {
                  close();
                  exportSql(useDiagramStore.getState().diagram);
                }}
              >
                <FileText size={14} /> Export ▸ SQL
              </MenuItem>
              <MenuItem
                onClick={() => {
                  close();
                  void exportImage(useDiagramStore.getState().diagram);
                }}
              >
                <Image size={14} /> Export ▸ Image
              </MenuItem>
              <MenuItem
                onClick={() => {
                  close();
                  exportDiagramJson(useDiagramStore.getState().diagram);
                }}
              >
                <FileJson size={14} /> Export ▸ JSON
              </MenuItem>
              <div className="my-0.5 border-t border-border" />
              <MenuItem onClick={() => { close(); void saveNow(); }}>
                <Save size={14} /> Save
              </MenuItem>
            </>
          )}
        </Dropdown>

        <button
          type="button"
          onClick={() => openDialog("share")}
          className="flex h-8 items-center gap-1 rounded-md px-2 text-sm text-text-primary hover:bg-zinc-100"
        >
          Share
        </button>
      </div>

      <div className="relative flex items-center gap-2">
        <span className="hidden text-[11px] text-text-faint lg:inline">
          {diagram.tables.length}/{MAX_TABLES} tables
        </span>

        <Dropdown
          width="w-44"
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className="flex h-8 items-center gap-1 rounded-md border border-border bg-white px-2 text-xs font-medium text-text-primary shadow-panel hover:bg-zinc-50"
            >
              {currentDriver?.label ?? "MySQL"} <ChevronDown size={13} className="text-text-faint" />
            </button>
          )}
        >
          {({ close }) => (
            <>
              {DRIVERS.map((d) => (
                <MenuItem
                  key={d.id}
                  onClick={() => {
                    close();
                    switchDriver(d.id);
                  }}
                >
                  <span className="flex items-center gap-2">
                    {d.label}
                    {d.id === diagram.driver && (
                      <span className="ml-auto text-brand-500">✓</span>
                    )}
                  </span>
                </MenuItem>
              ))}
            </>
          )}
        </Dropdown>

        <button
          type="button"
          onClick={() => setSaveOpen((o) => !o)}
          className="flex h-8 items-center gap-1 rounded-md bg-brand-500 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
        >
          Save to account
        </button>
        {saveOpen && (
          <div className="absolute right-3 top-12 z-50 w-72 rounded-lg border border-border bg-white p-3 shadow-floating">
            <p className="text-xs text-text-primary">
              <strong>No account needed.</strong> Your diagram autosaves to this
              browser (IndexedDB / localStorage) and can be shared via a snapshot
              link.
            </p>
            <p className="mt-2 text-[11px] text-text-faint">
              Team sync, version history and private diagrams are Pro features not
              included in this build.
            </p>
            <button
              type="button"
              className="mt-2 w-full rounded-md bg-brand-50 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-100"
              onClick={() => setSaveOpen(false)}
            >
              Got it
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
