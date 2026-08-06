import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import { getDriver, type DriverTypeSpec } from "#/lib/drivers";
import type { Driver } from "#/types/diagram";
import { cn } from "#/lib/utils/cn";

export function TypeSelect({
  driver,
  value,
  onChange,
}: {
  driver: Driver;
  value: string;
  onChange: (type: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const types = useMemo(() => getDriver(driver).types, [driver]);
  const current = getDriver(driver).typeMap.get(value.toLowerCase());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return types;
    return types.filter(
      (t) => t.name.includes(q) || (t.label ?? "").toLowerCase().includes(q),
    );
  }, [types, query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-6 w-full items-center gap-1 rounded border border-border px-1.5 text-[11px] text-text-primary hover:bg-zinc-50 dark:hover:bg-zinc-800"
      >
        <span className="min-w-0 flex-1 truncate text-left font-medium">
          {((current?.label ?? value) || "type").toUpperCase()}
        </span>
        <ChevronDown size={11} className="shrink-0 text-text-faint" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 w-56 rounded-lg border border-border bg-white shadow-floating dark:bg-zinc-900">
          <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
            <Search size={12} className="text-text-faint" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search types…"
              className="h-5 w-full bg-transparent text-xs text-text-primary outline-none placeholder:text-text-faint"
            />
          </div>
          <div className="scrollbar-thin max-h-56 overflow-y-auto p-1">
            {filtered.map((t: DriverTypeSpec) => (
              <button
                key={t.name}
                type="button"
                onClick={() => {
                  onChange(t.name);
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded px-2 py-1 text-left text-[11px] hover:bg-brand-50 dark:hover:bg-brand-500/15",
                  t.name === value.toLowerCase() && "text-brand-600 dark:text-brand-400",
                )}
              >
                <span className="font-medium">{(t.label ?? t.name).toUpperCase()}</span>
                <span className="text-[10px] text-text-faint">
                  {t.params === "length" && "length"}
                  {t.params === "precision-scale" && "prec, scale"}
                  {t.supportsEnum && "enum"}
                  {t.supportsSet && "set"}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-2 py-3 text-center text-[11px] text-text-faint">
                No types match “{query}”
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
