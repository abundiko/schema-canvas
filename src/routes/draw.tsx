import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

import { useDiagramStore } from "#/lib/store/diagramStore";
import { useUiStore } from "#/lib/store/uiStore";
import { loadSession } from "#/lib/persistence/autosave";
import { startAutosave } from "#/lib/persistence/hydrate";
import { decodeDiagram } from "#/lib/utils/compress";
import { useEditorShortcuts } from "#/lib/utils/useEditorShortcuts";
import { consumeSharedDiagramOpened } from "#/lib/utils/sharedDiagram";
import { registerExportRoot } from "#/lib/export/exportImage";
import { DiagramCanvas } from "#/components/canvas/DiagramCanvas";
import { TopNavBar } from "#/components/toolbars/TopNavBar";
import { TabBar } from "#/components/toolbars/TabBar";
import { CanvasToolSwitcher } from "#/components/toolbars/CanvasToolSwitcher";
import { ViewportToolbar } from "#/components/toolbars/ViewportToolbar";
import { AIPanel } from "#/components/toolbars/AIPanel";
import { InspectorPanel } from "#/components/inspector/InspectorPanel";
import { ImportDdlDialog } from "#/components/dialogs/ImportDdlDialog";
import { ImportDbmlDialog } from "#/components/dialogs/ImportDbmlDialog";
import { ExportDialog } from "#/components/dialogs/ExportDialog";
import { ShareDialog } from "#/components/dialogs/ShareDialog";
import { FilesDialog } from "#/components/dialogs/FilesDialog";
import { CommandPalette } from "#/components/dialogs/CommandPalette";
import { ShortcutsDialog } from "#/components/dialogs/ShortcutsDialog";

export const Route = createFileRoute("/draw")({
  component: DrawPage,
});

function DrawPage() {
  const diagramName = useDiagramStore((s) => s.diagram.name);
  const openDiagram = useDiagramStore((s) => s.openDiagram);
  const replaceSession = useDiagramStore((s) => s.replaceSession);
  const panelCollapsed = useDiagramStore((s) => s.panelCollapsed);
  const aiOpen = useUiStore((s) => s.aiOpen);
  const setAiOpen = useUiStore((s) => s.setAiOpen);
  const notice = useUiStore((s) => s.notice);

  const hydratedRef = useRef(false);

  // Reflect the active diagram's name in the browser tab title
  useEffect(() => {
    document.title = `${diagramName} — SchemaCanvas`;
  }, [diagramName]);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("d");
    if (encoded) {
      const shared = decodeDiagram(encoded);
      if (shared) openDiagram(shared);
      return;
    }
    // A diagram was just opened from a share link; don't clobber it with the session.
    if (consumeSharedDiagramOpened()) return;
    void loadSession().then((saved) => {
      if (saved) replaceSession(saved);
    });
  }, [openDiagram, replaceSession]);

  useEffect(() => {
    return startAutosave();
  }, []);

  useEditorShortcuts();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas-bg">
      <TopNavBar />
      <TabBar />

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
            className="absolute right-3 top-3 z-20 flex h-8 items-center gap-1.5 rounded-full border border-border bg-white px-3 text-xs font-semibold text-text-primary shadow-floating transition-colors hover:bg-brand-50 hover:text-brand-600 dark:bg-zinc-900 dark:hover:bg-brand-500/15"
          >
            <Sparkles size={14} className={aiOpen ? "text-brand-500" : ""} />
            AI
          </button>

          <AIPanel />
          <ViewportToolbar />
        </div>
      </div>

      {notice && (
        <div className="fixed bottom-4 left-1/2 z-[90] -translate-x-1/2 rounded-full border border-border bg-white px-4 py-2 text-xs font-medium text-text-primary shadow-floating dark:bg-zinc-900">
          {notice}
        </div>
      )}

      <ImportDdlDialog />
      <ImportDbmlDialog />
      <ExportDialog />
      <ShareDialog />
      <FilesDialog />
      <CommandPalette />
      <ShortcutsDialog />
    </div>
  );
}