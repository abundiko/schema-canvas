import { useUiStore } from "#/lib/store/uiStore";
import { Modal } from "#/components/ui";

const SHORTCUTS: Array<{ keys: string; label: string }> = [
  { keys: "Space", label: "Pan the canvas" },
  { keys: "T", label: "Add a table tool" },
  { keys: "N", label: "Add a sticky note tool" },
  { keys: "⌘ / Ctrl + K", label: "Open command palette" },
  { keys: "?", label: "Show this help" },
  { keys: "⌘ / Ctrl + Z", label: "Undo" },
  { keys: "⌘ / Ctrl + Shift + Z", label: "Redo" },
  { keys: "⌘ / Ctrl + C", label: "Copy selected table(s)" },
  { keys: "⌘ / Ctrl + V", label: "Paste copied table(s)" },
  { keys: "⌘ / Ctrl + D", label: "Duplicate selected table(s)" },
  { keys: "⌘ / Ctrl + Enter", label: "Add a column to the selected table" },
  { keys: "⌘ / Ctrl + '", label: "Add a composite index to the selected table" },
  { keys: "⌘ / Ctrl + S", label: "Save to browser" },
  { keys: "+ / =", label: "Zoom in" },
  { keys: "-", label: "Zoom out" },
  { keys: "Delete / Backspace", label: "Delete selection" },
  { keys: "Escape", label: "Deselect / close" },
];

export function ShortcutsDialog() {
  const open = useUiStore((s) => s.shortcutsOpen);
  const setOpen = useUiStore((s) => s.setShortcutsOpen);

  if (!open) return null;

  return (
    <Modal title="Keyboard shortcuts" onClose={() => setOpen(false)} width="max-w-md">
      <div className="grid grid-cols-1 gap-1">
        {SHORTCUTS.map((s) => (
          <div
            key={s.keys + s.label}
            className="flex items-center justify-between gap-4 py-1"
          >
            <span className="text-xs text-text-muted">{s.label}</span>
            <kbd className="shrink-0 rounded border border-border bg-zinc-50 px-2 py-0.5 font-mono text-[11px] text-text-primary dark:bg-zinc-800">
              {s.keys}
            </kbd>
          </div>
        ))}
      </div>
    </Modal>
  );
}
