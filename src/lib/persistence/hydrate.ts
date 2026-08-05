import { useDiagramStore } from "#/lib/store/diagramStore";
import { saveDiagram } from "./autosave";

const DEBOUNCE_MS = 500;

let timer: ReturnType<typeof setTimeout> | null = null;

/** Subscribe to store changes and write the diagram after a debounce. */
export function startAutosave(): () => void {
  return useDiagramStore.subscribe((state, prev) => {
    if (state.diagram === prev.diagram) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void saveDiagram(useDiagramStore.getState().diagram);
    }, DEBOUNCE_MS);
  });
}
