import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Database,
  Download,
  Import,
  Layers,
  PencilRuler,
  StickyNote,
  Workflow,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

const FEATURES = [
  {
    icon: Database,
    title: "Drop tables on an infinite canvas",
    body: "Define columns, types, keys and indexes per SQL driver — then drag columns to draw foreign keys.",
  },
  {
    icon: Workflow,
    title: "Relationships with cardinality",
    body: "Drag from a column's connector dot to another to create a foreign key with one-to-one, one-to-many or many-to-many markers.",
  },
  {
    icon: Layers,
    title: "Groups & sticky notes",
    body: "Organize tables into labeled, colored subject areas and annotate the design with resizable sticky notes.",
  },
  {
    icon: Import,
    title: "Import from DDL",
    body: "Paste or upload a CREATE TABLE script and get a populated diagram, including inferred foreign keys.",
  },
  {
    icon: Download,
    title: "Export to SQL & image",
    body: "Generate driver-accurate DDL (MySQL, PostgreSQL, SQL Server, MariaDB) or a PNG snapshot of the canvas.",
  },
  {
    icon: PencilRuler,
    title: "Autosaves to your browser",
    body: "Every change is saved locally as you work. Refresh never loses work. No account required.",
  },
];

function Home() {
  return (
    <div className="min-h-screen bg-canvas-bg text-text-primary">
      {/* nav */}
      <nav className="flex h-14 items-center justify-between border-b border-border bg-white px-6 dark:bg-panel-bg">
        <span className="flex items-center gap-1.5 text-sm font-bold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500 text-white">
            <Database size={15} />
          </span>
          SchemaCanvas
        </span>
        <Link
          to="/draw"
          className="flex h-9 items-center gap-1.5 rounded-md bg-brand-500 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
        >
          Open editor <ArrowRight size={14} />
        </Link>
      </nav>

      {/* hero */}
      <section className="mx-auto max-w-4xl px-6 pb-16 pt-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Design databases like you{"'"}re{" "}
          <span className="bg-gradient-to-r from-brand-500 to-accent-teal bg-clip-text text-transparent">
            sketching
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-text-muted">
          A DrawSQL-style entity-relationship diagram editor that runs entirely in
          your browser. Drop tables onto an infinite canvas, connect columns with
          foreign keys, and export real SQL — no account, no install.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            to="/draw"
            className="flex h-11 items-center gap-2 rounded-lg bg-brand-500 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
          >
            Start drawing <ArrowRight size={15} />
          </Link>
          <span className="flex h-11 items-center gap-1.5 rounded-lg border border-border bg-white px-4 text-xs text-text-muted shadow-panel dark:bg-zinc-900">
            <StickyNote size={13} className="text-amber-500" />
            20-table sandbox · autosaves locally
          </span>
        </div>
      </section>

      {/* features */}
      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 pb-20 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-border bg-white p-5 shadow-panel dark:bg-zinc-900"
          >
            <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              <f.icon size={17} />
            </span>
            <h3 className="text-sm font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-text-muted">
              {f.body}
            </p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-text-faint">
        SchemaCanvas — a DrawSQL-style clone for learning & prototyping. Not
        affiliated with DrawSQL.
      </footer>
    </div>
  );
}
