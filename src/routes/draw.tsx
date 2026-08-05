import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

import { useDiagramStore } from "#/lib/store/diagramStore";
import { useUiStore } from "#/lib/store/uiStore";
import { loadDiagram } from "#/lib/persistence/autosave";
import { startAutosave } from "#/lib/persistence/hydrate";
import { decodeDiagram } from "#/lib/utils/compress";
import { registerExportRoot } from "#/lib/export/exportImage";
import { useEditorShortcuts } from "#/lib/utils/useEditorShortcuts";
import { DiagramCanvas } from "#/components/canvas/DiagramCanvas";
import { TopNavBar } from "#/components/toolbars/TopNavBar";
import { CanvasToolSwitcher } from "#/components/toolbars/CanvasToolSwitcher";
import { ViewportToolbar } from "#/components/toolbars/ViewportToolbar";
import { AIPanel } from "#/components/toolbars/AIPanel";
import { InspectorPanel } from "#/components/inspector/InspectorPanel";
import { ImportDdlDialog } from "#/components/dialogs/ImportDdlDialog";
import { ExportDialog } from "#/components/dialogs/ExportDialog";
import { ShareDialog } from "#/components/dialogs/ShareDialog";

export const Route = createFileRoute("/draw")({
  component: DrawPage,
});

function DrawPage() {
  const setDiagram = useDiagramStore((s) => s.setDiagram);
  const panelCollapsed = useDiagramStore((s) => s.panelCollapsed);
  const aiOpen = useUiStore((s) => s.aiOpen);
  const setAiOpen = useUiStore((s) => s.setAiOpen);
  const notice = useUiStore((s) => s.notice);

  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("d");
    if (encoded) {
      const shared = decodeDiagram(encoded);
      if (shared) {
        setDiagram(shared);
        return;
      }
    }
    void loadDiagram().then((saved) => {
      if (saved) setDiagram(saved);
    });
  }, [setDiagram]);

  useEffect(() => {
    return startAutosave();
  }, []);

  useEditorShortcuts();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas-bg">
      <TopNavBar />

      <div className="flex min-h-0 flex-1">
        {!panelCollapsed && <InspectorPanel />}

        <div className="relative min-w-0 flex-1">
          <div ref={(el) => registerExportRoot(el)} className="h-full w-full">
            <DiagramCanvas />
          </div>

          <CanvasToolSwitcher />

          <button
            type="button"
            onClick={() => setAiOpen(!aiOpen)}
            className="absolute right-3 top-3 z-20 flex h-8 items-center gap-1.5 rounded-full border border-border bg-white px-3 text-xs font-semibold text-text-primary shadow-floating transition-colors hover:bg-brand-50 hover:text-brand-600"
          >
            <Sparkles size={14} className={aiOpen ? "text-brand-500" : ""} />
            AI
          </button>

          <AIPanel />
          <ViewportToolbar />
        </div>
      </div>

      {notice && (
        <div className="fixed bottom-4 left-1/2 z-[90] -translate-x-1/2 rounded-full border border-border bg-white px-4 py-2 text-xs font-medium text-text-primary shadow-floating">
          {notice}
        </div>
      )}

      <ImportDdlDialog />
      <ExportDialog />
      <ShareDialog />
    </div>
  );
}
