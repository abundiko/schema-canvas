import { Check, ChevronDown, Database, FileCode2, FileJson, FileText, Image, Monitor, Moon, Plus, Save, Sun } from "lucide-react";

import { useDiagramStore } from "#/lib/store/diagramStore";
import { resolveTheme, useUiStore, type ThemeMode } from "#/lib/store/uiStore";
import { exportSql, exportDbml, exportTs, exportMongoSchema, exportImage, exportDiagramJson } from "#/lib/export/exportActions";
import { generateTableDdl } from "#/lib/ddl/generateDdl";
import { DRIVERS, getDriver } from "#/lib/drivers";
import { saveSession } from "#/lib/persistence/autosave";
import { Dropdown, MenuItem } from "#/components/ui";

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string; Icon: typeof Sun }> = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

function ThemeSwitcher() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const resolved = resolveTheme(theme);
  const Icon = resolved === "dark" ? Moon : Sun;

  return (
    <Dropdown
      width="w-40"
      trigger={({ toggle }) => (
        <button
          type="button"
          aria-label="Theme switcher"
          title="Theme"
          onClick={toggle}
          className="flex h-8 items-center gap-1 rounded-md border border-border bg-white px-2 text-xs font-medium text-text-primary shadow-panel hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <Icon size={14} className={theme === "dark" ? "text-accent-teal" : "text-amber-500"} />
          <span className="hidden sm:inline">{theme === "system" ? "System" : resolved === "dark" ? "Dark" : "Light"}</span>
        </button>
      )}
    >
      {({ close }) => (
        <>
          {THEME_OPTIONS.map(({ value, label, Icon: OptionIcon }) => (
            <MenuItem
              key={value}
              onClick={() => {
                close();
                setTheme(value);
              }}
            >
              <span className="flex w-full items-center gap-2">
                <OptionIcon size={14} className={value === "dark" ? "text-accent-teal" : "text-amber-500"} />
                {label}
                {theme === value && <Check size={14} className="ml-auto text-brand-500" />}
              </span>
            </MenuItem>
          ))}
        </>
      )}
    </Dropdown>
  );
}

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
    await saveSession({ tabs: s.tabs, activeTabId: s.activeTabId });
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
    <header className="relative flex h-12 shrink-0 items-center justify-between border-b border-border bg-white px-3 dark:bg-panel-bg">
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
          onClick={() => openDialog("share")}
          className="flex h-8 items-center gap-1 rounded-md px-2 text-sm text-text-primary hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Share
        </button>
      </div>

      <button
        type="button"
        onClick={() => useUiStore.getState().setShortcutsOpen(true)}
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-text-muted hover:bg-zinc-100 dark:hover:bg-zinc-800"
        title="Show keyboard shortcuts"
      >
        <kbd className="flex h-4 min-w-4 items-center justify-center rounded border border-border bg-zinc-50 px-1 font-mono text-[10px] text-text-primary dark:bg-zinc-800">
          ?
        </kbd>
        <span className="hidden sm:inline">Shortcuts</span>
      </button>

      <div className="relative flex items-center gap-2">
        <ThemeSwitcher />

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
