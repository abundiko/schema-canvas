import { useEffect, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";

import { useDiagramStore } from "#/lib/store/diagramStore";
import { createShareLink } from "#/server/functions/shareLink";
import { Button, Modal } from "#/components/ui";
import { useUiStore } from "#/lib/store/uiStore";

export function ShareDialog() {
  const open = useUiStore((s) => s.dialog === "share");
  const closeDialog = useUiStore((s) => s.closeDialog);
  const showNotice = useUiStore((s) => s.showNotice);
  const diagram = useDiagramStore((s) => s.diagram);
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBusy(true);
    setFailed(false);
    setLink(null);
    void (async () => {
      try {
        const { id } = await createShareLink({ data: diagram });
        if (cancelled) return;
        setLink(`${window.location.origin}/s/${id}`);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, diagram]);

  if (!open) return null;

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showNotice("Could not access the clipboard.");
    }
  };

  return (
    <Modal title="Share diagram" onClose={closeDialog} width="max-w-lg">
      <div className="space-y-3">
        <p className="text-xs text-text-muted">
          Anyone with this link can view a snapshot of your diagram.
        </p>
        {busy && (
          <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-zinc-50 px-3 dark:bg-zinc-800/60">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            <span className="text-xs text-text-muted">Creating link…</span>
          </div>
        )}
        {failed && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            Could not create a share link. Please try again.
          </p>
        )}
        {link && !busy && (
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.target.select()}
              className="h-8 w-full rounded-md border border-border bg-zinc-50 px-2 font-mono text-[11px] outline-none focus:border-brand-500 dark:bg-zinc-800/60"
            />
            <Button variant="primary" onClick={() => void copy()}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        )}
        <p className="flex items-start gap-1.5 text-[11px] text-text-faint">
          <Link2 size={12} className="mt-0.5 shrink-0" />
          The diagram is stored as a snapshot on our server. Edits you make
          after sharing aren’t reflected in the link.
        </p>
      </div>
    </Modal>
  );
}
