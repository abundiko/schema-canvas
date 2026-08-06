import { MoreHorizontal } from "lucide-react";

import { useDiagramStore } from "#/lib/store/diagramStore";
import { getDriver } from "#/lib/drivers";
import type { Column } from "#/types/diagram";
import { classifyDefault, type DefaultKind } from "#/lib/utils/defaults";
import { Dropdown, Field, TextInput } from "#/components/ui";
import { cn } from "#/lib/utils/cn";

const INT_TYPES = new Set(["tinyint", "smallint", "mediumint", "int", "integer", "bigint"]);

export function ColumnAttributesPopover({
  column,
  onChange,
}: {
  column: Column;
  onChange: (patch: Partial<Column>) => void;
}) {
  const driver = useDiagramStore((s) => s.diagram.driver);
  const spec = getDriver(driver).typeMap.get(column.type.toLowerCase());
  const isInt = INT_TYPES.has(column.type.toLowerCase());
  const isMySQL = driver === "mysql" || driver === "mariadb";
  const isPG = driver === "postgresql";
  const isMSSQL = driver === "sqlserver";

  const kind: DefaultKind = column.default?.kind ?? "function";

  return (
    <Dropdown
      align="left"
      width="w-72"
      trigger={({ toggle }) => (
        <button
          type="button"
          aria-label="Column attributes"
          title="Attributes"
          onClick={toggle}
          className="flex h-6 w-5 items-center justify-center rounded text-text-faint hover:bg-zinc-100 hover:text-text-primary dark:hover:bg-zinc-800"
        >
          <MoreHorizontal size={13} />
        </button>
      )}
    >
      {({ close }) => (
        <div className="max-h-80 space-y-3 overflow-y-auto scrollbar-thin p-1">
          {/* Default value */}
          <Field label="Default value">
            <div className="flex gap-1.5">
              <TextInput
                value={column.default?.raw ?? ""}
                placeholder="e.g. now(), 0, 'active'"
                onChange={(v) => onChange({ default: { raw: v, kind: classifyDefault(v).kind } })}
                className="h-7 text-xs"
              />
              <span
                className={cn(
                  "flex h-7 shrink-0 items-center rounded border px-1.5 text-[10px] font-medium",
                  kind === "string" && "border-teal-200 bg-teal-50 text-teal-600 dark:border-teal-500/40 dark:bg-teal-500/15 dark:text-teal-400",
                  kind === "number" && "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-400",
                  kind === "function" && "border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-400",
                )}
              >
                {kind}
              </span>
            </div>
          </Field>

          {/* MySQL / MariaDB */}
          {isMySQL && isInt && (
            <label className="flex items-center gap-2 text-xs text-text-primary">
              <input
                type="checkbox"
                checked={!!column.autoIncrement}
                onChange={(e) => onChange({ autoIncrement: e.target.checked })}
                className="accent-brand-500"
              />
              Auto increment
            </label>
          )}
          {isMySQL && isInt && (
            <label className="flex items-center gap-2 text-xs text-text-primary">
              <input
                type="checkbox"
                checked={!!column.unsigned}
                onChange={(e) => onChange({ unsigned: e.target.checked })}
                className="accent-brand-500"
              />
              Unsigned
            </label>
          )}

          {/* SQL Server identity */}
          {isMSSQL && isInt && (
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs text-text-primary">
                <input
                  type="checkbox"
                  checked={!!column.identity}
                  onChange={(e) =>
                    onChange({ identity: e.target.checked ? { seed: 1, increment: 1 } : undefined })
                  }
                  className="accent-brand-500"
                />
                Identity
              </label>
              {column.identity && (
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    aria-label="Identity seed"
                    value={column.identity.seed}
                    onChange={(e) =>
                      onChange({ identity: { seed: Number(e.target.value) || 0, increment: column.identity?.increment ?? 1 } })
                    }
                    className="h-7 w-full rounded border border-border px-1.5 text-xs dark:bg-zinc-950"
                  />
                  <input
                    type="number"
                    aria-label="Identity increment"
                    value={column.identity.increment}
                    onChange={(e) =>
                      onChange({ identity: { seed: column.identity?.seed ?? 1, increment: Number(e.target.value) || 0 } })
                    }
                    className="h-7 w-full rounded border border-border px-1.5 text-xs dark:bg-zinc-950"
                  />
                </div>
              )}
            </div>
          )}

          {/* PostgreSQL array */}
          {isPG && spec?.supportsArray && (
            <label className="flex items-center gap-2 text-xs text-text-primary">
              <input
                type="checkbox"
                checked={!!column.isArray}
                onChange={(e) => onChange({ isArray: e.target.checked })}
                className="accent-brand-500"
              />
              Array type ([])
            </label>
          )}

          {/* MySQL ENUM / SET */}
          {column.type === "enum" && (
            <Field label="Enum values">
              <textarea
                value={column.enumValues?.join(", ") ?? ""}
                onChange={(e) =>
                  onChange({
                    enumValues: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                rows={3}
                className="w-full rounded border border-border px-1.5 py-1 text-xs dark:bg-zinc-950"
              />
            </Field>
          )}
          {column.type === "set" && (
            <Field label="Set values">
              <textarea
                value={column.setValues?.join(", ") ?? ""}
                onChange={(e) =>
                  onChange({
                    setValues: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                rows={3}
                className="w-full rounded border border-border px-1.5 py-1 text-xs dark:bg-zinc-950"
              />
            </Field>
          )}

          {/* Comment */}
          <Field label="Comment">
            <TextInput
              value={column.comment ?? ""}
              placeholder="Column comment"
              onChange={(v) => onChange({ comment: v || undefined })}
              className="h-7 text-xs"
            />
          </Field>

          <button
            type="button"
            onClick={close}
            className="mt-1 w-full rounded bg-brand-50 py-1 text-[11px] font-medium text-brand-600 hover:bg-brand-100 dark:bg-brand-500/15 dark:hover:bg-brand-500/25"
          >
            Done
          </button>
        </div>
      )}
    </Dropdown>
  );
}
