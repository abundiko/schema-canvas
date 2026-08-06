import { useState } from "react";
import { Check, Loader2, Sparkles, Wand2, X } from "lucide-react";

import { useDiagramStore } from "#/lib/store/diagramStore";
import { useUiStore } from "#/lib/store/uiStore";
import { generateSchemaFromPrompt, type AiGenerateResult } from "#/server/functions/generateSchemaFromPrompt";
import { reviewSchema, type ReviewSuggestion } from "#/server/functions/reviewSchema";
import { lintDiagram, severityOrder } from "#/lib/lint/lint";
import { createId } from "#/lib/utils/ids";
import type { Column, Relationship, TableEntity } from "#/types/diagram";
import { Button } from "#/components/ui";
import { cn } from "#/lib/utils/cn";

type Tab = "generate" | "review" | "issues";

export function AIPanel() {
  const open = useUiStore((s) => s.aiOpen);
  const setAiOpen = useUiStore((s) => s.setAiOpen);
  const [tab, setTab] = useState<Tab>("generate");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<AiGenerateResult | null>(null);
  const [applied, setApplied] = useState(false);
  const [suggestions, setSuggestions] = useState<ReviewSuggestion[] | null>(null);
  const [appliedFixes, setAppliedFixes] = useState<Set<string>>(new Set());
  const [reviewBusy, setReviewBusy] = useState(false);
  const [issueFixes, setIssueFixes] = useState<Set<string>>(new Set());

  const diagram = useDiagramStore((s) => s.diagram);
  const issues = tab === "issues" ? lintDiagram(diagram) : [];

  if (!open) return null;

  const generate = async () => {
    setBusy(true);
    setProposal(null);
    setApplied(false);
    try {
      const result = await generateSchemaFromPrompt({ data: prompt });
      setProposal(result);
    } finally {
      setBusy(false);
    }
  };

  const applyProposal = () => {
    if (!proposal) return;
    const store = useDiagramStore.getState();
    const diagram = store.diagram;
    const newTables: TableEntity[] = [];
    const colMap = new Map<string, { tableId: string; columnId: string }>();

    proposal.tables.forEach((t, idx) => {
      const tableId = createId("tbl");
      const columns: Column[] = t.columns.map((c, i) => {
        const columnId = createId("col");
        colMap.set(`${t.name}.${c.name}`, { tableId, columnId });
        return {
          id: columnId,
          name: c.name,
          type: c.type,
          typeParams: c.typeParams,
          nullable: c.nullable,
          keyType: c.keyType,
          order: i,
        };
      });
      newTables.push({
        id: tableId,
        name: t.name,
        color: t.color,
        position: { x: 100 + (idx % 3) * 280, y: 100 + Math.floor(idx / 3) * 260 },
        columns,
        indexes: [],
      });
    });

    const relationships: Relationship[] = [];
    for (const r of proposal.relationships) {
      const src = colMap.get(`${r.fromTable}.${r.fromColumn}`);
      const tgt = colMap.get(`${r.toTable}.${r.toColumn}`);
      if (!src || !tgt) continue;
      relationships.push({
        id: createId("rel"),
        sourceTableId: src.tableId,
        sourceColumnId: src.columnId,
        targetTableId: tgt.tableId,
        targetColumnId: tgt.columnId,
        cardinality: "one-to-many",
      });
    }

    store.setDiagram({
      ...diagram,
      driver: proposal.driver,
      tables: [...diagram.tables, ...newTables],
      relationships: [...diagram.relationships, ...relationships],
      updatedAt: new Date().toISOString(),
    });
    setApplied(true);
    useUiStore.getState().showNotice(`Applied ${newTables.length} table(s) from AI.`);
  };

  const runReview = async () => {
    setReviewBusy(true);
    setSuggestions(null);
    try {
      const result = await reviewSchema({
        data: useDiagramStore.getState().diagram,
      });
      setSuggestions(result);
    } finally {
      setReviewBusy(false);
    }
  };

  const applyFix = (s: ReviewSuggestion) => {
    if (!s.fix || appliedFixes.has(s.id)) return;
    const store = useDiagramStore.getState();
    if (s.fix.type === "addIndex" && s.fix.columnId) {
      store.updateColumn(s.fix.tableId, s.fix.columnId, { keyType: "index" });
    } else if (s.fix.type === "primaryKey" && s.fix.columnId) {
      store.updateColumn(s.fix.tableId, s.fix.columnId, { keyType: "primary" });
    }
    setAppliedFixes((prev) => new Set(prev).add(s.id));
  };

  const applyLintFix = (id: string) => {
    const issue = issues.find((i) => i.id === id);
    if (!issue?.fix || issueFixes.has(id)) return;
    const store = useDiagramStore.getState();
    if (issue.fix.type === "addIndex" && issue.fix.columnId) {
      store.updateColumn(issue.fix.tableId, issue.fix.columnId, { keyType: "index" });
    } else if (issue.fix.type === "primaryKey" && issue.fix.columnId) {
      store.updateColumn(issue.fix.tableId, issue.fix.columnId, { keyType: "primary" });
    }
    setIssueFixes((prev) => new Set(prev).add(id));
  };

  return (
    <div className="absolute right-3 top-14 z-30 flex h-[min(560px,calc(100%-72px))] w-80 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-floating dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
          <Sparkles size={15} className="text-brand-500" /> AI assistant
        </span>
        <button
          type="button"
          aria-label="Close AI panel"
          onClick={() => setAiOpen(false)}
          className="rounded p-1 text-text-muted hover:bg-zinc-100 hover:text-text-primary dark:hover:bg-zinc-800"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex gap-1 border-b border-border px-2 py-1.5">
        {(["generate", "review", "issues"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
              tab === t
                ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                : "text-text-muted hover:bg-zinc-50 dark:hover:bg-zinc-800",
            )}
          >
            {t}
            {t === "issues" && issues.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-white">
                {issues.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-3">
        {tab === "generate" ? (
          <>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder='e.g. "add invoicing to the billing schema"'
              className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:bg-zinc-950"
            />
            <Button
              variant="primary"
              onClick={() => void generate()}
              disabled={busy || !prompt.trim()}
              className="w-full"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              Generate schema
            </Button>

            {proposal && !applied && (
              <div                   className="rounded-lg border border-brand-200 bg-brand-50/60 p-2.5 dark:border-brand-500/30 dark:bg-brand-500/10">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                  Proposed additions
                </p>
                {proposal.tables.map((t) => (
                  <div key={t.name} className="mb-1.5 text-xs">
                    <span
                      className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="font-semibold text-text-primary">{t.name}</span>
                    <span className="ml-1 text-text-faint">
                      {t.columns.map((c) => c.name).join(", ")}
                    </span>
                  </div>
                ))}
                <Button variant="primary" onClick={applyProposal} className="mt-2 w-full text-[11px]">
                  Apply additions
                </Button>
              </div>
            )}
            {applied && (
              <p className="flex items-center gap-1.5 text-xs text-accent-teal">
                <Check size={14} /> Applied to your diagram.
              </p>
            )}
          </>
        ) : tab === "review" ? (
          <>
            <Button variant="subtle" onClick={() => void runReview()} disabled={reviewBusy} className="w-full">
              {reviewBusy ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              Review schema
            </Button>
            {suggestions &&
              suggestions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border border-border bg-zinc-50/70 p-2.5 dark:bg-zinc-800/60"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full",
                        s.severity === "error" && "bg-red-500",
                        s.severity === "warning" && "bg-amber-500",
                        s.severity === "info" && "bg-brand-500",
                      )}
                    />
                    <p className="flex-1 text-xs text-text-primary">{s.message}</p>
                  </div>
                  {s.fix && !appliedFixes.has(s.id) && (
                    <button
                      type="button"
                      onClick={() => applyFix(s)}
                      className="mt-1.5 ml-3.5 rounded bg-brand-500 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-brand-600"
                    >
                      Apply fix
                    </button>
                  )}
                  {appliedFixes.has(s.id) && (
                    <p className="mt-1.5 ml-3.5 text-[11px] text-accent-teal">Applied ✓</p>
                  )}
                </div>
              ))}
          </>
        ) : (
          <>
            {issues.length === 0 ? (
              <div className="rounded-lg border border-border bg-zinc-50/70 p-3 text-center text-xs text-text-muted dark:bg-zinc-800/60">
                No issues found. Your schema looks clean.
              </div>
            ) : (
              [...issues].sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity)).map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border border-border bg-zinc-50/70 p-2.5 dark:bg-zinc-800/60"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full",
                        s.severity === "error" && "bg-red-500",
                        s.severity === "warning" && "bg-amber-500",
                        s.severity === "info" && "bg-brand-500",
                      )}
                    />
                    <p className="flex-1 text-xs text-text-primary">{s.message}</p>
                  </div>
                  {s.fix && !issueFixes.has(s.id) && (
                    <button
                      type="button"
                      onClick={() => applyLintFix(s.id)}
                      className="mt-1.5 ml-3.5 rounded bg-brand-500 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-brand-600"
                    >
                      Apply fix
                    </button>
                  )}
                  {issueFixes.has(s.id) && (
                    <p className="mt-1.5 ml-3.5 text-[11px] text-accent-teal">Applied ✓</p>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </div>

      <div className="border-t border-border px-3 py-1.5 text-[10px] text-text-faint">
        Mock backend — wire a real LLM into{" "}
        <code>src/server/functions/</code> to enable production responses.
      </div>
    </div>
  );
}
