let pendingSharedDiagram = false;

/** Mark that a shared diagram was just opened; `/draw` should skip session hydration. */
export function markSharedDiagramOpened(): void {
  pendingSharedDiagram = true;
}

export function consumeSharedDiagramOpened(): boolean {
  const value = pendingSharedDiagram;
  pendingSharedDiagram = false;
  return value;
}
