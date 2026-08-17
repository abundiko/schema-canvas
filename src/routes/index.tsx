import { useCallback, useEffect, useRef, useState, type ReactNode, type MouseEvent as ReactMouseEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Braces,
  ChevronRight,
  Database,
  FileDown,
  Layers,
  MousePointer2,
  PencilRuler,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";

import { cn } from "#/lib/utils/cn";

export const Route = createFileRoute("/")(  {
  component: Home,
});

/* ======================= hooks ============================================ */

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? Math.min(window.scrollY / h, 1) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return progress;
}

function useScrollDirection() {
  const [dir, setDir] = useState<"up" | "down">("up");
  const [scrolled, setScrolled] = useState(false);
  const lastY = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);
      if (Math.abs(y - lastY.current) > 5) {
        setDir(y > lastY.current ? "down" : "up");
        lastY.current = y;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return { dir, scrolled };
}

function useScrollLinked() {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      // Use how far the element has been scrolled off-screen relative to its height
      const rect = el.getBoundingClientRect();
      const h = el.offsetHeight || 1;
      // 0 when at natural position, 1 when fully scrolled past
      const raw = Math.max(0, -rect.top) / (h * 0.6);
      setProgress(Math.max(0, Math.min(1, raw)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return { ref, progress };
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); io.disconnect(); } },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, inView };
}

function Reveal({ children, delay, className }: { children: ReactNode; delay?: string; className?: string }) {
  const { ref, inView } = useReveal();
  return (
    <div ref={ref} data-delay={delay} className={cn("lnd-reveal", inView && "lnd-in", className)}>
      {children}
    </div>
  );
}

function useParallax(sensitivity = 12) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const layers = el.querySelectorAll("[data-parallax]") as NodeListOf<HTMLElement>;
    if (!layers.length) return;
    const onMove = (e: MouseEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      layers.forEach((layer) => {
        const d = Number(layer.dataset.parallax ?? 1);
        layer.style.translate = `${nx * sensitivity * d}px ${ny * sensitivity * d}px`;
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => { window.removeEventListener("mousemove", onMove); layers.forEach((l) => (l.style.translate = "")); };
  }, [sensitivity]);
  return ref;
}

function useCursorGlow() {
  const onMouseMove = useCallback((e: ReactMouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--glow-x", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--glow-y", `${e.clientY - r.top}px`);
  }, []);
  return { onMouseMove };
}

/* Animated counter on scroll-into-view */
function useCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const { ref, inView } = useReveal();

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration]);

  return { ref, value };
}

/* ================================ NAV ===================================== */

function Nav() {
  const scrollProgress = useScrollProgress();
  const { dir, scrolled } = useScrollDirection();

  return (
    <>
      <div className="lnd-progress-bar" style={{ transform: `scaleX(${scrollProgress})` }} />
      <nav className={cn("lnd-nav", scrolled && dir === "down" && "lnd-nav-hidden", scrolled && "lnd-nav-scrolled")}>
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white">
              <Database size={14} />
            </span>
            Schemiwa
          </Link>
          <div className="flex items-center gap-3">
            <a href="#features" className="hidden text-sm font-medium text-[var(--lnd-text-muted)] transition-colors hover:text-white sm:block">
              Features
            </a>
            <a href="#preview" className="hidden text-sm font-medium text-[var(--lnd-text-muted)] transition-colors hover:text-white sm:block">
              Preview
            </a>
            <Link
              to="/draw"
              className="flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-semibold text-zinc-900 transition-all hover:-translate-y-px hover:bg-zinc-100"
            >
              Open editor <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}

/* ============================== SQL TYPING HERO =========================== */

interface SqlToken {
  text: string;
  cls?: string;
}

const SQL_LINES: SqlToken[][] = [
  [
    { text: "CREATE", cls: "sql-kw" }, { text: " " }, { text: "TABLE", cls: "sql-kw" },
    { text: " " }, { text: "`users`", cls: "sql-name" }, { text: " (", cls: "sql-punct" },
  ],
  [
    { text: "  " }, { text: "`id`", cls: "sql-name" },
    { text: "       ", }, { text: "INT", cls: "sql-type" },
    { text: " " }, { text: "NOT NULL", cls: "sql-kw" },
    { text: " " }, { text: "AUTO_INCREMENT", cls: "sql-kw" },
    { text: ",", cls: "sql-punct" },
  ],
  [
    { text: "  " }, { text: "`email`", cls: "sql-name" },
    { text: "    " }, { text: "VARCHAR", cls: "sql-type" },
    { text: "(", cls: "sql-punct" }, { text: "255", cls: "sql-num" },
    { text: ")", cls: "sql-punct" }, { text: " " },
    { text: "NOT NULL", cls: "sql-kw" }, { text: " " },
    { text: "UNIQUE", cls: "sql-kw" }, { text: ",", cls: "sql-punct" },
  ],
  [
    { text: "  " }, { text: "`name`", cls: "sql-name" },
    { text: "     " }, { text: "VARCHAR", cls: "sql-type" },
    { text: "(", cls: "sql-punct" }, { text: "100", cls: "sql-num" },
    { text: ")", cls: "sql-punct" }, { text: ",", cls: "sql-punct" },
  ],
  [
    { text: "  " }, { text: "`role`", cls: "sql-name" },
    { text: "     " }, { text: "ENUM", cls: "sql-type" },
    { text: "(", cls: "sql-punct" }, { text: "'admin'", cls: "sql-str" },
    { text: ",", cls: "sql-punct" }, { text: "'user'", cls: "sql-str" },
    { text: ")", cls: "sql-punct" }, { text: ",", cls: "sql-punct" },
  ],
  [
    { text: "  " }, { text: "`created`", cls: "sql-name" },
    { text: "  " }, { text: "DATETIME", cls: "sql-type" },
    { text: " " }, { text: "DEFAULT", cls: "sql-kw" }, { text: " " },
    { text: "NOW()", cls: "sql-kw" }, { text: ",", cls: "sql-punct" },
  ],
  [
    { text: "  " }, { text: "PRIMARY KEY", cls: "sql-kw" },
    { text: " (", cls: "sql-punct" }, { text: "`id`", cls: "sql-name" },
    { text: ")", cls: "sql-punct" },
  ],
  [{ text: ");", cls: "sql-punct" }],
];

function SqlTypingEffect() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    let line = 0;
    const interval = setInterval(() => {
      line++;
      setVisibleLines(line);
      if (line >= SQL_LINES.length) clearInterval(interval);
    }, 280);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="lnd-code-block p-5">
      {/* Window chrome */}
      <div className="mb-4 flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-[11px] font-medium text-[var(--lnd-text-faint)]">schema.sql</span>
      </div>
      <pre className="m-0 overflow-x-auto text-[13px] leading-[1.8]">
        <code>
          {SQL_LINES.slice(0, visibleLines).map((line, li) => (
            <div
              key={li}
              className="lnd-sql-line"
              style={{ animationDelay: `${li * 0.05}s` }}
            >
              {line.map((token, ti) => (
                <span key={ti} className={token.cls}>{token.text}</span>
              ))}
            </div>
          ))}
          {visibleLines < SQL_LINES.length && <span className="lnd-cursor" />}
        </code>
      </pre>
    </div>
  );
}

function Hero() {
  const parallaxRef = useParallax(14);
  const { ref: scrollRef, progress } = useScrollLinked();
  const heroOpacity = Math.max(0, 1 - progress * 2);
  const heroY = -progress * 80;

  return (
    <section ref={scrollRef} className="relative min-h-screen overflow-hidden pt-14">
      {/* Dot grid background */}
      <div className="pointer-events-none absolute inset-0 lnd-dots" />

      {/* Gradient orbs */}
      <div ref={parallaxRef} className="pointer-events-none absolute inset-0">
        <div data-parallax="3" className="lnd-orb-1 absolute -left-32 top-32 h-96 w-96 rounded-full bg-brand-500/20 blur-[100px]" />
        <div data-parallax="-2" className="lnd-orb-2 absolute -right-24 top-48 h-80 w-80 rounded-full bg-accent-teal/15 blur-[80px]" />
        <div data-parallax="1" className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-brand-500/10 blur-[60px]" />
      </div>

      {/* Content */}
      <div
        className="lnd-hero-content relative mx-auto flex max-w-6xl flex-col items-center gap-12 px-6 pb-20 pt-24 lg:flex-row lg:items-start lg:gap-16 lg:pt-32"
        style={{ opacity: heroOpacity, transform: `translateY(${heroY}px)` }}
      >
        {/* Left — Copy */}
        <div className="flex-1 text-center lg:text-left">
          <Reveal>
            <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-[var(--lnd-border)] bg-[rgba(255,255,255,0.04)] px-3.5 py-1.5 text-[12px] font-medium text-[var(--lnd-text-muted)] lg:mx-0">
              <Zap size={12} className="text-brand-500" />
              Free &middot; No signup &middot; 100% browser
            </div>
          </Reveal>

          <Reveal delay="1">
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Design your schema visually,{" "}
              <span className="lnd-gradient-text">export real SQL</span>.
            </h1>
          </Reveal>

          <Reveal delay="2">
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--lnd-text-muted)] lg:mx-0">
              Schemiwa is an ER diagram editor with an infinite canvas, live SQL
              generation, and browser autosave. Think in tables, ship in code —
              nothing to install.
            </p>
          </Reveal>

          <Reveal delay="3">
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <CtaButton to="/draw">
                Start drawing <ArrowRight size={15} />
              </CtaButton>
              <a
                href="#features"
                className="flex h-11 items-center gap-2 rounded-lg border border-[var(--lnd-border)] px-5 text-sm font-semibold text-[var(--lnd-text)] transition-all hover:-translate-y-0.5 hover:border-[var(--lnd-border-strong)] hover:bg-[rgba(255,255,255,0.04)]"
              >
                See features <ChevronRight size={14} />
              </a>
            </div>
          </Reveal>
        </div>

        {/* Right — SQL typing */}
        <Reveal delay="3" className="w-full max-w-lg flex-shrink-0 lg:w-[440px]">
          <div className="relative">
            {/* Floating nodes */}
            <div
              data-parallax="3"
              className="lnd-float absolute -left-6 -top-4 z-10 hidden items-center gap-2 rounded-lg border border-[var(--lnd-border)] bg-[var(--lnd-surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--lnd-text)] shadow-lg lg:flex"
              style={{ ["--lnd-tilt" as string]: "-1deg" }}
            >
              <Workflow size={12} className="text-accent-teal" />
              users → orders
            </div>
            <div
              data-parallax="-2"
              className="lnd-float-slow absolute -bottom-3 -right-4 z-10 hidden items-center gap-2 rounded-lg border border-[var(--lnd-border)] bg-[var(--lnd-surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--lnd-text)] shadow-lg lg:flex"
              style={{ ["--lnd-tilt" as string]: "1.5deg" }}
            >
              <Database size={12} className="text-brand-500" />
              MySQL
            </div>
            <SqlTypingEffect />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---- CTA button with cursor glow ---- */
function CtaButton({ children, to }: { children: ReactNode; to: string }) {
  const { onMouseMove } = useCursorGlow();
  return (
    <Link
      to={to}
      onMouseMove={onMouseMove}
      className="lnd-cursor-glow lnd-pulse-glow flex h-11 items-center gap-2 rounded-lg bg-brand-500 px-6 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-brand-600"
    >
      <span className="relative z-[1] flex items-center gap-2">{children}</span>
    </Link>
  );
}

/* =========================== METRICS STRIP ================================ */

interface Metric {
  value: number;
  suffix: string;
  label: string;
  Icon: typeof Database;
}

const METRICS: Metric[] = [
  { value: 5, suffix: "", label: "SQL drivers supported", Icon: Database },
  { value: 6, suffix: "", label: "Export formats", Icon: FileDown },
  { value: 0, suffix: "", label: "Signups required", Icon: Zap },
  { value: 100, suffix: "%", label: "Browser-based", Icon: Layers },
];

function MetricCard({ metric }: { metric: Metric }) {
  const { ref, value } = useCounter(metric.value, 1000);
  const { Icon } = metric;
  return (
    <div ref={ref} className="flex flex-col items-center gap-2 px-6 py-6 text-center">
      <Icon size={18} className="text-brand-500" />
      <span className="lnd-counter-value text-3xl sm:text-4xl">
        {value}{metric.suffix}
      </span>
      <span className="text-sm font-medium text-[var(--lnd-text-muted)]">{metric.label}</span>
    </div>
  );
}

function MetricsStrip() {
  return (
    <section className="border-y border-[var(--lnd-border)] bg-[var(--lnd-bg-subtle)]">
      <div className="mx-auto grid max-w-5xl grid-cols-2 divide-x divide-[var(--lnd-border)] sm:grid-cols-4">
        {METRICS.map((m) => (
          <Reveal key={m.label}>
            <MetricCard metric={m} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ============================= BENTO GRID ================================= */

interface BentoCard {
  Icon: typeof Workflow;
  kicker: string;
  title: string;
  description: string;
  shot: string;
  shotAlt: string;
  iconColor: string;
}

const BENTO_CARDS: BentoCard[] = [
  {
    Icon: Workflow,
    kicker: "Infinite canvas",
    title: "Drop tables, draw keys",
    description: "Create tables, drag columns to connect foreign keys, and watch ER edges appear with cardinality markers. Pan, zoom, snap to grid.",
    shot: "/shot-canvas.png",
    shotAlt: "Schemiwa infinite canvas",
    iconColor: "text-accent-teal",
  },
  {
    Icon: PencilRuler,
    kicker: "Inspector",
    title: "Precise column editing",
    description: "Full inspector for types, nullability, primary/unique keys, auto-increment, and composite indexes — validated per SQL driver.",
    shot: "/shot-inspector.png",
    shotAlt: "Schemiwa inspector panel",
    iconColor: "text-brand-500",
  },
  {
    Icon: FileDown,
    kicker: "Import & export",
    title: "From DDL to real SQL",
    description: "Paste CREATE TABLE scripts to auto-populate diagrams. Export driver-accurate SQL, DBML, TypeScript types, JSON, or PNG.",
    shot: "/shot-export.png",
    shotAlt: "Schemiwa export dialog",
    iconColor: "text-amber-400",
  },
  {
    Icon: Sparkles,
    kicker: "AI-powered",
    title: "Schema reviews by AI",
    description: "Get instant AI-powered feedback on normalization, naming conventions, missing indexes, and relationship design.",
    shot: "/shot-editor.png",
    shotAlt: "Schemiwa AI review",
    iconColor: "text-purple-400",
  },
];

function BentoFeature({ card }: { card: BentoCard }) {
  const { Icon } = card;
  return (
    <div className="lnd-glass lnd-glow-border group flex flex-col p-6 sm:p-8">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.05)] ring-1 ring-[var(--lnd-border)]">
        <Icon size={20} className={card.iconColor} />
      </div>
      <span className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--lnd-text-faint)]">
        {card.kicker}
      </span>
      <h3 className="mb-2 text-lg font-bold text-[var(--lnd-text)]">{card.title}</h3>
      <p className="mb-5 flex-1 text-sm leading-relaxed text-[var(--lnd-text-muted)]">
        {card.description}
      </p>
      <div className="overflow-hidden rounded-lg border border-[var(--lnd-border)]">
        <img
          src={card.shot}
          alt={card.shotAlt}
          loading="lazy"
          className="lnd-bento-img aspect-[16/10] w-full object-cover object-top"
        />
      </div>
    </div>
  );
}

function BentoGrid() {
  return (
    <section id="features" className="relative py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 lnd-grid" />
      <div className="relative mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="mb-12 text-center">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--lnd-border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--lnd-text-faint)]">
              <MousePointer2 size={11} className="text-brand-500" />
              Features
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to design schemas
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[var(--lnd-text-muted)]">
              A complete toolkit that runs entirely in your browser — no backend, no account, no install.
            </p>
          </div>
        </Reveal>

        <div className="lnd-bento">
          {BENTO_CARDS.map((card, i) => (
            <Reveal key={card.kicker} delay={String(i + 1)}>
              <BentoFeature card={card} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================== CODE PREVIEW ================================= */

const CODE_TABS = [
  {
    label: "SQL",
    lang: "sql",
    content: [
      [{ text: "CREATE", cls: "sql-kw" }, { text: " " }, { text: "TABLE", cls: "sql-kw" }, { text: " " }, { text: "`products`", cls: "sql-name" }, { text: " (", cls: "sql-punct" }],
      [{ text: "  " }, { text: "`id`", cls: "sql-name" }, { text: "          " }, { text: "INT", cls: "sql-type" }, { text: " " }, { text: "NOT NULL", cls: "sql-kw" }, { text: " " }, { text: "AUTO_INCREMENT", cls: "sql-kw" }, { text: ",", cls: "sql-punct" }],
      [{ text: "  " }, { text: "`name`", cls: "sql-name" }, { text: "        " }, { text: "VARCHAR", cls: "sql-type" }, { text: "(", cls: "sql-punct" }, { text: "255", cls: "sql-num" }, { text: ")", cls: "sql-punct" }, { text: " " }, { text: "NOT NULL", cls: "sql-kw" }, { text: ",", cls: "sql-punct" }],
      [{ text: "  " }, { text: "`price`", cls: "sql-name" }, { text: "       " }, { text: "DECIMAL", cls: "sql-type" }, { text: "(", cls: "sql-punct" }, { text: "10", cls: "sql-num" }, { text: ",", cls: "sql-punct" }, { text: "2", cls: "sql-num" }, { text: ")", cls: "sql-punct" }, { text: ",", cls: "sql-punct" }],
      [{ text: "  " }, { text: "`category_id`", cls: "sql-name" }, { text: " " }, { text: "INT", cls: "sql-type" }, { text: ",", cls: "sql-punct" }],
      [{ text: "  " }, { text: "PRIMARY KEY", cls: "sql-kw" }, { text: " (", cls: "sql-punct" }, { text: "`id`", cls: "sql-name" }, { text: ")", cls: "sql-punct" }],
      [{ text: ");", cls: "sql-punct" }],
    ] as SqlToken[][],
  },
  {
    label: "DBML",
    lang: "dbml",
    content: [
      [{ text: "Table", cls: "sql-kw" }, { text: " " }, { text: "products", cls: "sql-name" }, { text: " {", cls: "sql-punct" }],
      [{ text: "  " }, { text: "id", cls: "sql-name" }, { text: "          " }, { text: "int", cls: "sql-type" }, { text: " [", cls: "sql-punct" }, { text: "pk", cls: "sql-kw" }, { text: ", ", cls: "sql-punct" }, { text: "increment", cls: "sql-kw" }, { text: "]", cls: "sql-punct" }],
      [{ text: "  " }, { text: "name", cls: "sql-name" }, { text: "        " }, { text: "varchar", cls: "sql-type" }, { text: "(", cls: "sql-punct" }, { text: "255", cls: "sql-num" }, { text: ")", cls: "sql-punct" }, { text: " [", cls: "sql-punct" }, { text: "not null", cls: "sql-kw" }, { text: "]", cls: "sql-punct" }],
      [{ text: "  " }, { text: "price", cls: "sql-name" }, { text: "       " }, { text: "decimal", cls: "sql-type" }, { text: "(", cls: "sql-punct" }, { text: "10,2", cls: "sql-num" }, { text: ")", cls: "sql-punct" }],
      [{ text: "  " }, { text: "category_id", cls: "sql-name" }, { text: " " }, { text: "int", cls: "sql-type" }],
      [{ text: "}", cls: "sql-punct" }],
    ] as SqlToken[][],
  },
  {
    label: "TypeScript",
    lang: "ts",
    content: [
      [{ text: "interface", cls: "sql-kw" }, { text: " " }, { text: "Product", cls: "sql-name" }, { text: " {", cls: "sql-punct" }],
      [{ text: "  " }, { text: "id", cls: "sql-name" }, { text: ":          " }, { text: "number", cls: "sql-type" }, { text: ";", cls: "sql-punct" }],
      [{ text: "  " }, { text: "name", cls: "sql-name" }, { text: ":        " }, { text: "string", cls: "sql-type" }, { text: ";", cls: "sql-punct" }],
      [{ text: "  " }, { text: "price", cls: "sql-name" }, { text: ":       " }, { text: "number", cls: "sql-type" }, { text: ";", cls: "sql-punct" }],
      [{ text: "  " }, { text: "category_id", cls: "sql-name" }, { text: ": " }, { text: "number", cls: "sql-type" }, { text: " | " }, { text: "null", cls: "sql-kw" }, { text: ";", cls: "sql-punct" }],
      [{ text: "}", cls: "sql-punct" }],
    ] as SqlToken[][],
  },
  {
    label: "JSON",
    lang: "json",
    content: [
      [{ text: "{", cls: "sql-punct" }],
      [{ text: "  " }, { text: "\"table\"", cls: "sql-name" }, { text: ": ", cls: "sql-punct" }, { text: "\"products\"", cls: "sql-str" }, { text: ",", cls: "sql-punct" }],
      [{ text: "  " }, { text: "\"columns\"", cls: "sql-name" }, { text: ": [", cls: "sql-punct" }],
      [{ text: "    { " }, { text: "\"name\"", cls: "sql-name" }, { text: ": ", cls: "sql-punct" }, { text: "\"id\"", cls: "sql-str" }, { text: ", ", cls: "sql-punct" }, { text: "\"type\"", cls: "sql-name" }, { text: ": ", cls: "sql-punct" }, { text: "\"INT\"", cls: "sql-str" }, { text: " },", cls: "sql-punct" }],
      [{ text: "    { " }, { text: "\"name\"", cls: "sql-name" }, { text: ": ", cls: "sql-punct" }, { text: "\"name\"", cls: "sql-str" }, { text: ", ", cls: "sql-punct" }, { text: "\"type\"", cls: "sql-name" }, { text: ": ", cls: "sql-punct" }, { text: "\"VARCHAR(255)\"", cls: "sql-str" }, { text: " }", cls: "sql-punct" }],
      [{ text: "  ]", cls: "sql-punct" }],
      [{ text: "}", cls: "sql-punct" }],
    ] as SqlToken[][],
  },
];

function CodePreview() {
  const [activeTab, setActiveTab] = useState(0);
  const tab = CODE_TABS[activeTab];

  return (
    <section id="preview" className="relative py-20 sm:py-28">
      <div className="relative mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="mb-10 text-center">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--lnd-border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--lnd-text-faint)]">
              <Braces size={11} className="text-accent-teal" />
              Export
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              One diagram, every format
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[var(--lnd-text-muted)]">
              Design visually, export as driver-accurate SQL, DBML, TypeScript types, or JSON — one click.
            </p>
          </div>
        </Reveal>

        <Reveal delay="1">
          <div className="mx-auto max-w-2xl">
            {/* Tabs */}
            <div className="mb-3 flex items-center gap-1 rounded-lg border border-[var(--lnd-border)] bg-[rgba(255,255,255,0.02)] p-1">
              {CODE_TABS.map((t, i) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setActiveTab(i)}
                  className={cn("lnd-code-tab flex-1", i === activeTab && "lnd-code-tab-active")}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Code block */}
            <div className="lnd-code-block p-5">
              <div className="mb-3 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 text-[11px] font-medium text-[var(--lnd-text-faint)]">
                  output.{tab.lang}
                </span>
              </div>
              <pre className="m-0 overflow-x-auto text-[13px] leading-[1.8]">
                <code>
                  {tab.content.map((line: SqlToken[], li: number) => (
                    <div key={`${activeTab}-${li}`} className="lnd-sql-line" style={{ animationDelay: `${li * 0.04}s` }}>
                      {line.map((token: SqlToken, ti: number) => (
                        <span key={ti} className={token.cls}>{token.text}</span>
                      ))}
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          </div>
        </Reveal>

        {/* Full product screenshot */}
        <Reveal delay="2" className="mt-16">
          <div className="lnd-screenshot mx-auto max-w-5xl">
            <img
              src="/shot-editor.png"
              alt="Schemiwa editor with a full e-commerce schema diagram"
              loading="lazy"
              className="w-full"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ================================= CTA ==================================== */

function GradientCta() {
  const { ref, inView } = useReveal();
  const { onMouseMove } = useCursorGlow();

  return (
    <section ref={ref} className="lnd-cta-mesh relative overflow-hidden py-28 sm:py-36">
      {/* Expanding glow */}
      <div className={cn("lnd-cta-glow", inView && "lnd-glow-active")} />
      <div className="pointer-events-none absolute inset-0 lnd-dots" />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Your schema, your browser,{" "}
            <span className="lnd-gradient-text">your SQL</span>.
          </h2>
        </Reveal>

        <Reveal delay="1">
          <p className="mx-auto mt-5 max-w-xl text-lg text-[var(--lnd-text-muted)]">
            Nothing to install, nothing to sign up for. Your work autosaves
            locally and exports to real, production-ready code.
          </p>
        </Reveal>

        <Reveal delay="2">
          <div className="mt-9 flex flex-col items-center gap-4">
            <Link
              to="/draw"
              onMouseMove={onMouseMove}
              className="lnd-cursor-glow lnd-pulse-glow flex h-13 items-center gap-2.5 rounded-xl bg-brand-500 px-8 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-brand-600"
            >
              <span className="relative z-[1] flex items-center gap-2.5">
                <Database size={16} />
                Open the editor
                <ArrowRight size={16} />
              </span>
            </Link>
            <span className="flex items-center gap-2 text-sm text-[var(--lnd-text-faint)]">
              or press <kbd className="lnd-kbd">⌘</kbd> <kbd className="lnd-kbd">N</kbd> in the editor to create a table
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ================================ FOOTER ================================== */

function Footer() {
  return (
    <footer className="border-t border-[var(--lnd-border)] py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 text-sm sm:flex-row sm:justify-between">
        <span className="flex items-center gap-2 font-semibold text-[var(--lnd-text)]">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-brand-500 text-white">
            <Database size={11} />
          </span>
          Schemiwa
        </span>
        <span className="text-[var(--lnd-text-faint)]">
          A free, browser-based database design tool.
        </span>
      </div>
    </footer>
  );
}

/* ================================ HOME ==================================== */

function Home() {
  return (
    <div className="lnd-dark min-h-screen">
      <Nav />
      <Hero />
      <MetricsStrip />
      <BentoGrid />
      <CodePreview />
      <GradientCta />
      <Footer />
    </div>
  );
}
