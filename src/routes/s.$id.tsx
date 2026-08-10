import { useEffect, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

import { getShareLink } from "#/server/functions/shareLink";
import { useDiagramStore } from "#/lib/store/diagramStore";
import { markSharedDiagramOpened } from "#/lib/utils/sharedDiagram";

export const Route = createFileRoute("/s/$id")({
  component: SharedDiagram,
});

function SharedDiagram() {
  const { id } = Route.useParams();
  const router = useRouter();
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const diagram = await getShareLink({ data: id });
        if (cancelled) return;
        if (!diagram) {
          setMissing(true);
          return;
        }
        useDiagramStore.getState().openDiagram(diagram);
        markSharedDiagramOpened();
        void router.navigate({ to: "/draw" });
      } catch {
        if (!cancelled) setMissing(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (missing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas-bg px-6 text-center">
        <p className="text-sm font-medium text-text-primary">
          This shared diagram could not be found.
        </p>
        <p className="max-w-sm text-xs text-text-muted">
          The link may be invalid or the diagram may have been removed.
        </p>
        <Link
          to="/draw"
          className="flex h-9 items-center rounded-md bg-brand-500 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
        >
          Open editor
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas-bg">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      <p className="text-xs text-text-muted">Opening shared diagram…</p>
    </div>
  );
}
