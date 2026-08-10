import { ChevronDown, Database, FileCode2, FileJson, FileText, Image, Plus, Save, Settings } from "lucide-react";

import { useDiagramStore } from "#/lib/store/diagramStore";
import { useUiStore } from "#/lib/store/uiStore";
import { exportSql, exportDbml, exportTs, exportMongoSchema, exportImage, exportDiagramJson } from "#/lib/export/exportActions";
import { generateTableDdl } from "#/lib/ddl/generateDdl";
import { DRIVERS, getDriver } from "#/lib/drivers";
import { saveSession } from "#/lib/persistence/autosave";
import { TabBar } from "#/components/toolbars/TabBar";
import { Dropdown, MenuItem } from "#/components/ui";

export function TopNavBar() {
  const diagram = useDiagramStore((s) => s.diagram);
  const setDriver = useDiagramStore((s) => s.setDriver);
  const addTab = useDiagramStore((s) => s.addTab);
  const openDialog = useUiStore((s) => s.openDialog);
  const showNotice = useUiStore((s) => s.showNotice);

  const currentDriver = DRIVERS.find((d) => d.id === diagram.driver);

  const newTab = () => {
    addTab();
  };

  const saveNow = async () => {
    const s = useDiagramStore.getState();
    await saveSession({ tabs: s.tabs, files: s.files, activeTabId: s.activeTabId });
    showNotice("Diagrams saved to this browser.");
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

  const selection = useDiagramStore.getState().selection;
  const selectedTable =
    selection.type === "table"
      ? useDiagramStore.getState().diagram.tables.find(
          (t) => t.id === selection.tableId,
        )
      : undefined;

  const copyTableSql = async () => {
    if (!selectedTable) return;
    const sql = generateTableDdl(useDiagramStore.getState().diagram, selectedTable.id);
    try {
      await navigator.clipboard.writeText(sql);
      showNotice(`Copied CREATE TABLE for "${selectedTable.name}" to clipboard.`);
    } catch {
      showNotice("Could not access the clipboard.");
    }
  };

  return (
    <header className="relative flex h-12 shrink-0 items-center gap-2 border-b border-border bg-white px-3 dark:bg-panel-bg">
      <div className="flex shrink-0 items-center gap-0.5">
        <a href="/" className="mr-1 flex items-center gap-1.5 text-sm font-bold text-text-primary" title="Schemiwa">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-500 text-white">
            <Database size={14} />
          </span>
          <span className="hidden lg:inline">Schemiwa</span>
        </a>

        <Dropdown
          width="w-44"
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className="flex h-8 items-center gap-1 rounded-md px-2 text-sm text-text-primary hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
                  newTab();
                }}
              >
                <Plus size={14} /> New tab
              </MenuItem>
              <MenuItem
                onClick={() => {
                  close();
                  openDialog("files");
                }}
              >
                <FileText size={14} /> My files…
              </MenuItem>
              <MenuItem
                onClick={() => {
                  close();
                  openDialog("import");
                }}
              >
                <FileText size={14} /> Import SQL…
              </MenuItem>
              <MenuItem
                onClick={() => {
                  close();
                  openDialog("importDbml");
                }}
              >
                <FileCode2 size={14} /> Import DBML…
              </MenuItem>
              <div className="my-0.5 border-t border-border" />
              {diagram.driver === "mongodb" ? (
                <MenuItem
                  onClick={() => {
                    close();
                    exportMongoSchema(useDiagramStore.getState().diagram);
                  }}
                >
                  <FileText size={14} /> Export ▸ MongoDB schema (.json)
                </MenuItem>
              ) : (
                <MenuItem
                  onClick={() => {
                    close();
                    exportSql(useDiagramStore.getState().diagram);
                  }}
                >
                  <FileText size={14} /> Export ▸ SQL
                </MenuItem>
              )}
              <MenuItem
                onClick={() => {
                  close();
                  exportDbml(useDiagramStore.getState().diagram);
                }}
              >
                <FileCode2 size={14} /> Export ▸ DBML
              </MenuItem>
              <MenuItem
                onClick={() => {
                  close();
                  exportTs(useDiagramStore.getState().diagram);
                }}
              >
                <FileCode2 size={14} /> Export ▸ TypeScript
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
              {selectedTable && (
                <>
                  <div className="my-0.5 border-t border-border" />
                  <MenuItem onClick={() => { close(); void copyTableSql(); }}>
                    <FileText size={14} /> Copy “{selectedTable.name}” as SQL
                  </MenuItem>
                </>
              )}
              <div className="my-0.5 border-t border-border" />
              <MenuItem onClick={() => { close(); void saveNow(); }}>
                <Save size={14} /> Save
              </MenuItem>
            </>
          )}
        </Dropdown>

        <button
          type="button"
          onClick={() => openDialog("settings")}
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-zinc-100 hover:text-text-primary dark:hover:bg-zinc-800"
          aria-label="Settings"
          title="Settings"
        >
          <Settings size={14} />
        </button>
      </div>

      <TabBar />

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => useUiStore.getState().setShortcutsOpen(true)}
          className="flex h-8 items-center gap-1 rounded-md px-2 text-xs text-text-muted hover:bg-zinc-100 dark:hover:bg-zinc-800"
          title="Show keyboard shortcuts"
        >
          <kbd className="flex h-4 min-w-4 items-center justify-center rounded border border-border bg-zinc-50 px-1 font-mono text-[10px] text-text-primary dark:bg-zinc-800">
            ?
          </kbd>
          <span className="hidden sm:inline">Shortcuts</span>
        </button>

        <Dropdown
          width="w-44"
          align="right"
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className="flex h-8 items-center gap-1 rounded-md border border-border bg-white px-2 text-xs font-medium text-text-primary shadow-panel hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
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
      </div>
    </header>
  );
}

