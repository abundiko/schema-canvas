import { useEffect, useRef, useState } from "react";
import { FileText, Plus, X } from "lucide-react";

import { useDiagramStore } from "#/lib/store/diagramStore";
import { cn } from "#/lib/utils/cn";

function TabName({ id, name }: { id: string; name: string }) {
  const renameTab = useDiagramStore((s) => s.renameTab);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(name);
      inputRef.current?.select();
    }
  }, [editing, name]);

  if (editing) {
    const commit = () => {
      setEditing(false);
      renameTab(id, draft);
    };
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
          e.stopPropagation();
        }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-28 rounded border border-brand-400 bg-white px-1 py-0 text-[11px] font-medium text-text-primary outline-none dark:bg-zinc-900"
        aria-label="Diagram tab name"
      />
    );
  }

  return (
    <span
      title="Double-click to rename"
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      className="max-w-36 truncate"
    >
      {name}
    </span>
  );
}

function TabItem({
  id,
  name,
  active,
  onClick,
  onClose,
}: {
  id: string;
  name: string;
  active: boolean;
  onClick: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role="tab"
      aria-selected={active}
      title={name}
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          onClose();
        }
      }}
      className={cn(
        "group flex h-7 min-w-0 max-w-48 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition-colors",
        active
          ? "border-brand-300 bg-brand-50 text-text-primary dark:border-brand-500/40 dark:bg-brand-500/15"
          : "border-transparent text-text-muted hover:bg-zinc-100 hover:text-text-primary dark:hover:bg-zinc-800/70",
      )}
      onClick={onClick}
    >
      <FileText size={12} className={cn("shrink-0", active ? "text-accent-teal" : "text-text-faint")} />
      <TabName id={id} name={name} />
      <button
        type="button"
        aria-label={`Close ${name}`}
        title="Close tab"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className={cn(
          "ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded text-text-faint hover:bg-zinc-200 hover:text-text-primary dark:hover:bg-zinc-700",
          active ? "opacity-60 hover:opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <X size={11} />
      </button>
    </div>
  );
}

export function TabBar() {
  const tabs = useDiagramStore((s) => s.tabs);
  const activeTabId = useDiagramStore((s) => s.activeTabId);
  const switchTab = useDiagramStore((s) => s.switchTab);
  const closeTab = useDiagramStore((s) => s.closeTab);
  const addTab = useDiagramStore((s) => s.addTab);

  return (
    <div
      role="tablist"
      aria-label="Diagrams"
      className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab) => (
        <TabItem
          key={tab.id}
          id={tab.id}
          name={tab.name}
          active={tab.id === activeTabId}
          onClick={() => switchTab(tab.id)}
          onClose={() => closeTab(tab.id)}
        />
      ))}
      <button
        type="button"
        aria-label="New tab"
        title="New tab"
        onClick={addTab}
        className="mb-0 flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-muted hover:bg-zinc-200 hover:text-text-primary dark:hover:bg-zinc-800"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
