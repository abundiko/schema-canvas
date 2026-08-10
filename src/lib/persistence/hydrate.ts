import { useDiagramStore } from "#/lib/store/diagramStore";
import { saveSession } from "./autosave";

const DEBOUNCE_MS = 500;

let timer: ReturnType<typeof setTimeout> | null = null;

/** Subscribe to store changes and write the whole session after a debounce. */
export function startAutosave(): () => void {
  return useDiagramStore.subscribe((state, prev) => {
    if (
      state.diagram === prev.diagram &&
      state.activeTabId === prev.activeTabId &&
      state.files === prev.files
    ) {
      return;
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const s = useDiagramStore.getState();
      void saveSession({ tabs: s.tabs, files: s.files, activeTabId: s.activeTabId });
    }, DEBOUNCE_MS);
  });
}
