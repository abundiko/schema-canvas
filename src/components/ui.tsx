import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "#/lib/utils/cn";

/* ---------------------------------- buttons --------------------------------- */

type ButtonVariant = "primary" | "subtle" | "ghost" | "danger";

export function Button({
  children,
  onClick,
  variant = "subtle",
  disabled,
  className,
  type = "button",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
  title?: string;
}) {
  const styles: Record<ButtonVariant, string> = {
    primary:
      "bg-brand-500 text-white hover:bg-brand-600 shadow-sm disabled:bg-brand-300",
    subtle:
      "bg-white border border-border text-text-primary hover:bg-zinc-50 shadow-panel dark:bg-zinc-900 dark:hover:bg-zinc-800",
    ghost: "text-text-muted hover:bg-zinc-100 hover:text-text-primary dark:hover:bg-zinc-800",
    danger:
      "bg-white border border-red-200 text-red-600 hover:bg-red-50 shadow-panel dark:bg-zinc-900 dark:hover:bg-red-500/10",
  };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 h-8 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  onClick,
  children,
  active,
  disabled,
  className,
  activeClass = "bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400",
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  className?: string;
  activeClass?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-zinc-100 hover:text-text-primary dark:hover:bg-zinc-800",
        active && activeClass,
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------------------------------- inputs ---------------------------------- */

export function TextInput({
  value,
  onChange,
  placeholder,
  className,
  autoFocus,
  onKeyDown,
  onFocus,
  onSelect,
  onBlur,
  spellCheck = false,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onSelect?: (e: React.SyntheticEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  spellCheck?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      spellCheck={spellCheck}
      autoFocus={autoFocus}
      onChange={(e) => onChange?.(e.target.value)}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onSelect={onSelect}
      onBlur={onBlur}
      className={cn(
        "h-8 w-full rounded-md border border-border bg-white px-2 text-sm text-text-primary outline-none transition-shadow placeholder:text-text-faint focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:bg-zinc-900",
        className,
      )}
    />
  );
}

export function Select({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-8 w-full appearance-none rounded-md border border-border bg-white px-2 pr-6 text-sm text-text-primary outline-none transition-shadow focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:bg-zinc-900",
        className,
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

/* --------------------------------- dropdown --------------------------------- */

export function Dropdown({
  trigger,
  children,
  align = "left",
  width = "w-48",
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (props: { close: () => void }) => ReactNode;
  align?: "left" | "right";
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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

  return (
    <div ref={ref} className="relative inline-block">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={cn(
            "absolute top-full z-50 mt-1 rounded-lg border border-border bg-white p-1 shadow-floating dark:bg-zinc-900",
            align === "left" ? "left-0" : "right-0",
            width,
          )}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  onClick,
  children,
  danger,
}: {
  onClick?: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text-primary hover:bg-zinc-100 dark:hover:bg-zinc-800",
        danger && "text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10",
      )}
    >
      {children}
    </button>
  );
}

/* ---------------------------------- modal ----------------------------------- */

export function Modal({
  title,
  onClose,
  children,
  width = "max-w-lg",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30"
        onMouseDown={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative w-full rounded-xl bg-white shadow-floating dark:bg-zinc-900",
          width,
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------ swatch picker ------------------------------ */

export function SwatchPicker({
  swatches,
  value,
  onChange,
}: {
  swatches: readonly string[];
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {swatches.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Color ${c}`}
          title={c}
          onClick={() => onChange(c)}
          className={cn(
            "h-6 w-6 rounded-md transition-transform hover:scale-110",
            value === c &&
              "ring-2 ring-brand-500 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900",
          )}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}
