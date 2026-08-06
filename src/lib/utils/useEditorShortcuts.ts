import { useEffect } from "react";

import { useDiagramStore } from "#/lib/store/diagramStore";
import { useUiStore } from "#/lib/store/uiStore";
import { emitCanvasEvent } from "#/lib/utils/canvasEvents";
import { saveDiagram } from "#/lib/persistence/autosave";
import { copySelection } from "#/lib/utils/commands";

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function useEditorShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const target = e.target;

      // Command-based shortcuts
      if (mod) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          const temporal = useDiagramStore.temporal.getState();
          if (e.shiftKey) temporal.redo();
          else if (!isEditable(target)) temporal.undo();
          return;
        }
        if (e.key.toLowerCase() === "s") {
          e.preventDefault();
          void saveDiagram(useDiagramStore.getState().diagram);
          useUiStore.getState().showNotice("Diagram saved to this browser.");
          return;
        }
        if (e.key.toLowerCase() === "k") {
          e.preventDefault();
          const ui = useUiStore.getState();
          ui.setCommandPaletteOpen(!ui.commandPaletteOpen);
          return;
        }
        if (e.key.toLowerCase() === "c" && !isEditable(target)) {
          e.preventDefault();
          copySelection();
          return;
        }
        if (e.key.toLowerCase() === "v" && !isEditable(target)) {
          e.preventDefault();
          useDiagramStore.getState().pasteTables();
          return;
        }
        if (e.key.toLowerCase() === "d" && !isEditable(target)) {
          e.preventDefault();
          copySelection();
          useDiagramStore.getState().pasteTables();
          return;
        }
        if (e.key === "Enter") {
          const sel = useDiagramStore.getState().selection;
          if (sel.type === "table") {
            e.preventDefault();
            useDiagramStore.getState().addColumn(sel.tableId);
          }
          return;
        }
        if (e.key === "'") {
          const sel = useDiagramStore.getState().selection;
          if (sel.type === "table") {
            e.preventDefault();
            useDiagramStore.getState().addCompositeIndex(sel.tableId);
          }
          return;
        }
      }

      // Don't trigger non-modifier actions while typing
      if (isEditable(target)) return;

      switch (e.key) {
        case "t":
        case "T":
          useDiagramStore.getState().setActiveTool("table");
          break;
        case "n":
        case "N":
          useDiagramStore.getState().setActiveTool("note");
          break;
        case "?":
          useUiStore.getState().setShortcutsOpen(true);
          break;
        case "Delete":
        case "Backspace": {
          e.preventDefault();
          deleteSelection();
          break;
        }
        case "Escape": {
          const s = useDiagramStore.getState();
          if (s.activeTool !== "select") s.setActiveTool("select");
          else s.setSelection({ type: "none" });
          break;
        }
        case "+":
        case "=":
          emitCanvasEvent({ type: "zoom-in" });
          break;
        case "-":
          emitCanvasEvent({ type: "zoom-out" });
          break;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
}

function deleteSelection() {
  const store = useDiagramStore.getState();
  switch (store.selection.type) {
    case "table":
      store.deleteTable(store.selection.tableId);
      break;
    case "tables":
      for (const id of store.selection.tableIds) store.deleteTable(id);
      store.setSelection({ type: "none" });
      break;
    case "group":
      store.deleteGroup(store.selection.groupId);
      break;
    case "note":
      store.deleteNote(store.selection.noteId);
      break;
    case "relationship":
      store.deleteRelationship(store.selection.relationshipId);
      break;
  }
}
