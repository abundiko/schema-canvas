import { Check, Grid3x3, Monitor, Moon, Sun } from "lucide-react";

import { useUiStore, type ThemeMode } from "#/lib/store/uiStore";
import { Modal } from "#/components/ui";
import { cn } from "#/lib/utils/cn";

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string; Icon: typeof Sun }> = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export function SettingsDialog() {
  const open = useUiStore((s) => s.dialog === "settings");
  const closeDialog = useUiStore((s) => s.closeDialog);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const gridVisible = useUiStore((s) => s.gridVisible);
  const setGridVisible = useUiStore((s) => s.setGridVisible);

  if (!open) return null;

  return (
    <Modal title="Settings" onClose={closeDialog} width="max-w-md">
      <div className="space-y-5">
        <div>
          <span className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-text-muted">
            Theme
          </span>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map(({ value, label, Icon: OptionIcon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1.5 rounded-lg border text-xs font-medium text-text-primary transition-colors",
                  theme === value
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-500/15"
                    : "border-border bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800",
                )}
              >
                <OptionIcon size={16} className={value === "dark" ? "text-accent-teal" : "text-amber-500"} />
                <span className="flex items-center gap-1">
                  {label}
                  {theme === value && <Check size={12} className="text-brand-500" />}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-text-muted">
            Canvas
          </span>
          <button
            type="button"
            onClick={() => setGridVisible(!gridVisible)}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <span className="flex items-center gap-2">
              <Grid3x3 size={15} className="text-text-muted" />
              Show grid
            </span>
            <span
              className={cn(
                "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                gridVisible ? "bg-brand-500" : "bg-zinc-300 dark:bg-zinc-700",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all",
                  gridVisible ? "left-[18px]" : "left-0.5",
                )}
              />
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
