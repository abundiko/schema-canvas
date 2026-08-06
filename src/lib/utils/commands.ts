import { createBlankDiagram, useDiagramStore } from "#/lib/store/diagramStore";
import { useUiStore, type ThemeMode } from "#/lib/store/uiStore";
import { emitCanvasEvent } from "#/lib/utils/canvasEvents";
import { exportDbml, exportDiagramJson, exportImage, exportTs } from "#/lib/export/exportActions";

export interface Command {
  id: string;
  label: string;
  keywords: string;
  shortcut?: string;
  run: () => void;
}

export function copySelection(): void {
  const s = useDiagramStore.getState();
  if (s.selection.type === "table") s.copyTables([s.selection.tableId]);
  else if (s.selection.type === "tables") s.copyTables(s.selection.tableIds);
}

export function getCommands(): Command[] {
  const store = useDiagramStore.getState();
  const ui = useUiStore.getState();
  const temporal = useDiagramStore.temporal.getState();

  return [
    { id: "new", label: "New diagram", keywords: "clear reset blank", run: () => store.setDiagram(createBlankDiagram()) },
    { id: "import-sql", label: "Import SQL…", keywords: "ddl create table import", run: () => ui.openDialog("import") },
    { id: "import-dbml", label: "Import DBML…", keywords: "dbml import dbml", run: () => ui.openDialog("importDbml") },
    { id: "export-sql", label: "Export SQL…", keywords: "sql ddl download", run: () => ui.openDialog("export") },
    { id: "export-dbml", label: "Export DBML…", keywords: "dbml download", run: () => exportDbml(useDiagramStore.getState().diagram) },
    { id: "export-ts", label: "Export TypeScript types…", keywords: "ts typescript types download", run: () => exportTs(useDiagramStore.getState().diagram) },
    { id: "export-json", label: "Export JSON…", keywords: "json download backup", run: () => exportDiagramJson(useDiagramStore.getState().diagram) },
    { id: "export-image", label: "Export image (PNG)…", keywords: "png image download", run: () => void exportImage(useDiagramStore.getState().diagram) },
    { id: "undo", label: "Undo", keywords: "undo revert", shortcut: "⌘Z", run: () => temporal.undo() },
    { id: "redo", label: "Redo", keywords: "redo", shortcut: "⇧⌘Z", run: () => temporal.redo() },
    { id: "add-table", label: "Add table", keywords: "table create new", shortcut: "T", run: () => store.addTable() },
    { id: "add-note", label: "Add sticky note", keywords: "note sticky", shortcut: "N", run: () => store.addNote() },
    { id: "add-group", label: "Add group", keywords: "group folder", run: () => store.addGroup() },
    { id: "copy", label: "Copy selected", keywords: "copy duplicate", shortcut: "⌘C", run: copySelection },
    { id: "paste", label: "Paste", keywords: "paste", shortcut: "⌘V", run: () => store.pasteTables() },
    { id: "duplicate", label: "Duplicate selected", keywords: "duplicate copy", shortcut: "⌘D", run: () => {
        const s = useDiagramStore.getState();
        if (s.selection.type === "table") s.copyTables([s.selection.tableId]);
        else if (s.selection.type === "tables") s.copyTables(s.selection.tableIds);
        s.pasteTables();
      } },
    { id: "arrange-grid", label: "Arrange tables (grid)", keywords: "layout arrange grid", run: () => store.arrangeTables("grid") },
    { id: "arrange-force", label: "Arrange tables (force)", keywords: "layout arrange force auto", run: () => store.arrangeTables("force") },
    { id: "fit-view", label: "Fit view", keywords: "fit zoom view", run: () => emitCanvasEvent({ type: "fit-view" }) },
    { id: "zoom-in", label: "Zoom in", keywords: "zoom in", run: () => emitCanvasEvent({ type: "zoom-in" }) },
    { id: "zoom-out", label: "Zoom out", keywords: "zoom out", run: () => emitCanvasEvent({ type: "zoom-out" }) },
    { id: "zoom-reset", label: "Reset zoom", keywords: "zoom reset 100", run: () => emitCanvasEvent({ type: "zoom-reset" }) },
    { id: "toggle-grid", label: "Toggle grid", keywords: "grid dots background", run: () => ui.setGridVisible(!ui.gridVisible) },
    { id: "fullscreen", label: "Toggle fullscreen", keywords: "fullscreen", run: () => emitCanvasEvent({ type: "toggle-fullscreen" }) },
    { id: "ai", label: "Toggle AI panel", keywords: "ai assistant review", run: () => ui.setAiOpen(!ui.aiOpen) },
    { id: "theme-light", label: "Theme: light", keywords: "theme light", run: () => ui.setTheme("light") },
    { id: "theme-dark", label: "Theme: dark", keywords: "theme dark", run: () => ui.setTheme("dark") },
    { id: "theme-system", label: "Theme: system", keywords: "theme system auto", run: () => ui.setTheme("system") },
    { id: "shortcuts", label: "Keyboard shortcuts", keywords: "help shortcuts keys", shortcut: "?", run: () => ui.setShortcutsOpen(true) },
  ];
}

export function runCommand(id: string): void {
  const cmd = getCommands().find((c) => c.id === id);
  cmd?.run();
}

export function setThemeMode(mode: ThemeMode): void {
  useUiStore.getState().setTheme(mode);
}
