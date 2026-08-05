import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { useDiagramStore } from "#/lib/store/diagramStore";
import { encodeDiagram } from "#/lib/utils/compress";
import { Button, Modal } from "#/components/ui";
import { useUiStore } from "#/lib/store/uiStore";

export function ShareDialog() {
  const open = useUiStore((s) => s.dialog === "share");
  const closeDialog = useUiStore((s) => s.closeDialog);
  const diagram = useDiagramStore((s) => s.diagram);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const url = `${window.location.origin}${window.location.pathname}?d=${encodeDiagram(diagram)}`;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Modal title="Share diagram" onClose={closeDialog} width="max-w-lg">
      <div className="space-y-3">
        <p className="text-xs text-text-muted">
          This link encodes a snapshot of your diagram so anyone can open it. It
          lives in the URL only — <strong>save your diagram to keep it permanently</strong>.
        </p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            className="h-8 w-full rounded-md border border-border bg-zinc-50 px-2 font-mono text-[11px] outline-none focus:border-brand-500"
          />
          <Button variant="primary" onClick={() => void copy()}>
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="text-[11px] text-text-faint">
          Stretch goal: server-persisted share records with 30-day expiry (see
          <code> server/functions/shareLink.ts</code>).
        </p>
      </div>
    </Modal>
  );
}
