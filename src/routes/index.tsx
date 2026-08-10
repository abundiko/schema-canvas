import { useEffect, useRef, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Braces,
  Database,
  FileDown,
  MousePointer2,
  PencilRuler,
  Share2,
  Sparkles,
  Workflow,
} from "lucide-react";

import { cn } from "#/lib/utils/cn";

export const Route = createFileRoute("/")({
  component: Home,
});

/* ------------------------------ reveal hook ------------------------------- */

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, inView };
}

function Reveal({
  children,
  delay,
  className,
}: {
  children: ReactNode;
  delay?: string;
  className?: string;
}) {
  const { ref, inView } = useReveal();
  return (
    <div
      ref={ref}
      data-delay={delay}
      className={cn("lnd-reveal", inView && "lnd-in", className)}
    >
      {children}
    </div>
  );
}

/* ------------------------- hero mouse parallax hook ------------------------ */

function useParallax(sensitivity = 12) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const layers = el.querySelectorAll("[data-parallax]") as NodeListOf<HTMLElement>;
    if (!layers.length) return;

    const onMove = (e: MouseEvent) => {
      const { innerWidth: w, innerHeight: h } = window;
      const nx = e.clientX / w - 0.5;
      const ny = e.clientY / h - 0.5;
      layers.forEach((layer) => {
        const depth = Number(layer.dataset.parallax ?? 1);
        const tx = nx * sensitivity * depth;
        const ty = ny * sensitivity * depth;
        layer.style.translate = `${tx}px ${ty}px`;
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      layers.forEach((l) => (l.style.translate = ""));
    };
  }, [sensitivity]);

  return ref;
}

/* --------------------------------- nav ----------------------------------- */

function Nav() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-border bg-white/80 backdrop-blur-md dark:bg-panel-bg/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-1.5 text-sm font-bold text-text-primary">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500 text-white">
            <Database size={15} />
          </span>
          Schemiwa
        </Link>
        <Link
          to="/draw"
          className="flex h-9 items-center gap-1.5 rounded-md bg-brand-500 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-brand-600"
        >
          Open editor <ArrowRight size={14} />
        </Link>
      </div>
    </nav>
  );
}

/* ------------------------------ hero section ------------------------------ */

function Hero() {
  const parallaxRef = useParallax(14);

  return (
    <section ref={parallaxRef} className="relative overflow-hidden pt-14">
      <div className="pointer-events-none absolute inset-0 text-zinc-200/70 opacity-70 dark:text-zinc-800/60 lnd-dots" />
      <div
        data-parallax="4"
        className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-brand-500/15 blur-3xl"
      />
      <div
        data-parallax="-3"
        className="pointer-events-none absolute -right-20 top-40 h-80 w-80 rounded-full bg-accent-teal/15 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-20 text-center sm:pt-28">
        <Reveal>
          <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-[11px] font-medium text-text-muted shadow-panel dark:bg-zinc-900">
            <Sparkles size={12} className="text-brand-500" />
            Free · No account · Runs in your browser
          </div>
        </Reveal>

        <Reveal delay="1">
          <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Design databases like you{"'"}re{" "}
            <span className="lnd-gradient-text bg-gradient-to-r from-brand-500 via-accent-teal to-brand-500 bg-clip-text text-transparent">
              sketching
            </span>
            .
          </h1>
        </Reveal>

        <Reveal delay="2">
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-text-muted">
            Schemiwa is an entity-relationship diagram editor with an infinite
            canvas, live SQL exports and browser autosave. Think in tables, ship
            in schema — no account, no install.
          </p>
        </Reveal>

        <Reveal delay="3">
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/draw"
              className="lnd-pulse-glow flex h-11 items-center gap-2 rounded-lg bg-brand-500 px-6 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-brand-600"
            >
              Start drawing <ArrowRight size={15} />
            </Link>
            <a
              href="#features"
              className="flex h-11 items-center gap-2 rounded-lg border border-border bg-white px-6 text-sm font-semibold text-text-primary shadow-panel transition-all hover:-translate-y-0.5 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              See what it does
            </a>
          </div>
        </Reveal>
      </div>

      {/* parallax product mock */}
      <Reveal delay="4" className="relative mx-auto max-w-6xl px-6 pb-20">
        <div
          className="group relative overflow-hidden rounded-xl border border-border bg-white shadow-floating dark:bg-panel-bg"
          style={{ perspective: "1200px" }}
        >
          <div
            data-parallax="2"
            className="absolute left-3 top-3 z-10 hidden items-center gap-1.5 rounded-md border border-border bg-white px-2 py-1 text-[10px] font-medium text-text-muted shadow-panel dark:bg-zinc-900 sm:flex"
          >
            <Database size={11} className="text-brand-500" />
            Schemiwa — E-commerce store
          </div>
          <div className="aspect-[16/10] w-full overflow-hidden bg-canvas-bg">
            <img
              src="/shot-editor.png"
              alt="Schemiwa editor with a diagram of an e-commerce schema"
              loading="eager"
              className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]"
            />
          </div>

          {/* floating feature chips */}
          <div
            data-parallax="3"
            className="lnd-float absolute -left-4 top-16 hidden items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-[11px] font-medium text-text-primary shadow-floating dark:bg-zinc-900 md:flex"
            style={{ ["--lnd-tilt" as string]: "-2deg" }}
          >
            <Workflow size={13} className="text-accent-teal" />
            Drag columns to draw foreign keys
          </div>
          <div
            data-parallax="-3"
            className="lnd-float-slow absolute -right-4 bottom-24 hidden items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-[11px] font-medium text-text-primary shadow-floating dark:bg-zinc-900 md:flex"
            style={{ ["--lnd-tilt" as string]: "2deg" }}
          >
            <Share2 size={13} className="text-brand-500" />
            Share a link to your diagram
          </div>
          <div
            data-parallax="2"
            className="lnd-float-x absolute -bottom-5 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-[11px] font-medium text-text-primary shadow-floating dark:bg-zinc-900 md:flex"
          >
            <Sparkles size={13} className="text-amber-500" />
            Autosaves as you type
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ----------------------------- marquee strip ------------------------------ */

const DRIVERS = ["MySQL", "PostgreSQL", "SQL Server", "MariaDB", "MongoDB"];

function DriverMarquee() {
  const items = [...DRIVERS, ...DRIVERS, ...DRIVERS];
  return (
    <section className="border-y border-border bg-white py-6 dark:bg-panel-bg">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent dark:from-panel-bg" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent dark:from-panel-bg" />
        <div className="lnd-marquee flex w-max items-center gap-10 whitespace-nowrap">
          {items.map((d, i) => (
            <span key={`${d}-${i}`} className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-faint">
              <Database size={13} className="text-brand-500/70" />
              {d}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ feature rows ------------------------------ */

interface FeatureSpec {
  kicker: string;
  title: string;
  body: string;
  bullets: string[];
  shot: string;
  shotAlt: string;
  chip: ReactNode;
  chipClass?: string;
  Icon: typeof Workflow;
  accent: string;
}

const FEATURES: FeatureSpec[] = [
  {
    kicker: "Infinite canvas",
    title: "Drop tables, draw keys, stay in flow",
    body: "A blank canvas that never runs out of room. Create tables, drag columns onto each other to build foreign keys, and watch cardinality markers appear as you connect.",
    bullets: [
      "Live ER edges with one-to-one, one-to-many and many-to-many markers",
      "Drag-to-pan, zoom with the wheel or trackpad, grid snapping",
      "Sticky notes and color-coded groups to annotate your design",
    ],
    shot: "/shot-canvas.png",
    shotAlt: "Schemiwa infinite canvas with a products and categories diagram",
    chip: <><MousePointer2 size={13} /> Drag from a column dot to connect</>,
    Icon: Workflow,
    accent: "from-brand-500/15 to-accent-teal/10",
  },
  {
    kicker: "Inspector",
    title: "Columns, types and keys — precise",
    body: "Every table has a full inspector for column types, nullability, primary/unique/index keys, auto-increment and composite indexes — validated against the active SQL driver.",
    bullets: [
      "Driver-aware type picker (MySQL, PostgreSQL, SQL Server, MariaDB)",
      "Inline add/duplicate/delete and column reordering",
      "Composite indexes with per-column sort order",
    ],
    shot: "/shot-inspector.png",
    shotAlt: "Schemiwa inspector panel editing a users table",
    chip: <><PencilRuler size={13} /> Edit columns in the inspector</>,
    Icon: PencilRuler,
    accent: "from-accent-teal/15 to-brand-500/10",
  },
  {
    kicker: "Import & export",
    title: "From DDL to real SQL, both ways",
    body: "Paste a CREATE TABLE script and get a populated diagram with inferred foreign keys. Then export driver-accurate DDL, DBML, TypeScript types, JSON or a PNG snapshot.",
    bullets: [
      "Import from SQL DDL or DBML",
      "Export SQL, DBML, TypeScript types, JSON and PNG",
      "Per-table DDL copy for the table you have selected",
    ],
    shot: "/shot-export.png",
    shotAlt: "Schemiwa export dialog with generated SQL preview",
    chip: <><Braces size={13} /> Export driver-accurate SQL</>,
    Icon: FileDown,
    accent: "from-amber-400/15 to-accent-rose/10",
  },
];

function FeatureRow({ spec, flip }: { spec: FeatureSpec; flip?: boolean }) {
  const { Icon } = spec;
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className={cn("grid items-center gap-10 lg:grid-cols-2", flip && "lg:[&>*:first-child]:order-2")}>
        <Reveal>
          <div className="space-y-4">
            <span className="flex w-fit items-center gap-1.5 rounded-md border border-border bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted shadow-panel dark:bg-zinc-900">
              <Icon size={12} className="text-brand-500" />
              {spec.kicker}
            </span>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{spec.title}</h2>
            <p className="leading-relaxed text-text-muted">{spec.body}</p>
            <ul className="space-y-2">
              {spec.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-text-muted">
                  <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden>
                      <path d="M2 5.2 4.2 7.4 8 2.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay="1">
          <div className="group relative">
            <div className={cn("absolute -inset-3 rounded-2xl bg-gradient-to-br blur-xl", spec.accent)} />
            <div className="relative overflow-hidden rounded-xl border border-border bg-white shadow-floating dark:bg-panel-bg">
              <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              <img
                src={spec.shot}
                alt={spec.shotAlt}
                loading="lazy"
                className="aspect-[16/10] w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]"
              />
            </div>
            <div
              className={cn(
                "lnd-float absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-[11px] font-medium text-text-primary shadow-floating dark:bg-zinc-900",
                spec.chipClass,
              )}
            >
              {spec.chip}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------ CTA + footer ------------------------------ */

function Cta() {
  return (
    <section className="relative overflow-hidden border-t border-border py-24">
      <div className="pointer-events-none absolute inset-0 text-zinc-200/70 opacity-70 dark:text-zinc-800/60 lnd-dots" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/15 blur-3xl" />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Open the editor and draw your first table
          </h2>
        </Reveal>
        <Reveal delay="1">
          <p className="mx-auto mt-4 max-w-xl text-text-muted">
            Nothing to install, nothing to sign up for. Your work autosaves to
            your browser and exports to real SQL.
          </p>
        </Reveal>
        <Reveal delay="2">
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/draw"
              className="lnd-pulse-glow flex h-12 items-center gap-2 rounded-lg bg-brand-500 px-8 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-brand-600"
            >
              <Database size={15} /> Start drawing
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10 text-center text-xs text-text-faint">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 sm:flex-row sm:justify-between">
        <span className="flex items-center gap-1.5 font-semibold text-text-primary">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-brand-500 text-white">
            <Database size={11} />
          </span>
          Schemiwa
        </span>
        <span>Schemiwa — a database design tool.</span>
      </div>
    </footer>
  );
}

function Home() {
  return (
    <div className="min-h-screen bg-canvas-bg text-text-primary">
      <Nav />
      <Hero />
      <DriverMarquee />
      <div id="features" className="py-8">
        {FEATURES.map((f, i) => (
          <FeatureRow key={f.title} spec={f} flip={i % 2 === 1} />
        ))}
      </div>
      <Cta />
      <Footer />
    </div>
  );
}
