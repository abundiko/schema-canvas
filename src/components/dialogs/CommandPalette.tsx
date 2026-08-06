import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Search } from "lucide-react";

import { useUiStore } from "#/lib/store/uiStore";
import { getCommands } from "#/lib/utils/commands";

export function CommandPalette() {
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo(() => getCommands(), [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      `${c.label} ${c.keywords}`.toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  const run = (id: string) => {
    setOpen(false);
    getCommands().find((c) => c.id === id)?.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[active];
      if (cmd) run(cmd.id);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]">
      <div
        className="absolute inset-0 bg-black/30"
        onMouseDown={() => setOpen(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-[min(560px,90vw)] overflow-hidden rounded-xl border border-border bg-white shadow-floating dark:bg-zinc-900"
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Search size={15} className="text-text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a command…"
            className="h-6 w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-faint"
          />
        </div>
        <div className="scrollbar-thin max-h-[320px] overflow-y-auto p-1.5">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-text-faint">
              No commands match “{query}”.
            </p>
          )}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              type="button"
              onClick={() => run(cmd.id)}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm ${
                i === active
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400"
                  : "text-text-primary"
              }`}
            >
              <span className="flex-1 truncate">{cmd.label}</span>
              {cmd.shortcut && (
                <kbd className="flex items-center gap-1 text-[10px] text-text-faint">
                  {cmd.shortcut.split("+").map((k) => (
                    <span
                      key={k}
                      className="rounded border border-border px-1 py-0.5 font-mono"
                    >
                      {k}
                    </span>
                  ))}
                </kbd>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border px-3 py-1.5 text-[10px] text-text-faint">
          <span className="flex items-center gap-1">
            <CornerDownLeft size={11} /> to run
          </span>
          <span>↑↓ to navigate · Esc to close</span>
        </div>
      </div>
    </div>
  );
}
