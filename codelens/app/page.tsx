import Link from "next/link";
import { ArrowRight, GitBranch, Search, MessageSquareCode } from "lucide-react";
import { Button } from "@/components/ui/button";

const traceSteps = [
  { label: "repo.clone()", detail: "Pull structure, files, languages" },
  { label: "index.chunks()", detail: "Parse important files into code chunks" },
  { label: "grok.ground()", detail: "Answer only from retrieved context" },
  { label: "cite.sources()", detail: "Every claim links back to a file + line range" },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid-fade" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(#5EEAD4 1px, transparent 1px), linear-gradient(90deg, #5EEAD4 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-signal text-ink-900">
            <GitBranch className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <span className="font-display text-sm font-semibold tracking-tight">CodeLens</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-text-muted hover:text-text-primary">
            Log in
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-24 pt-16 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-[11px] text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-signal animate-pulse-dot" />
          grounded on your actual repository
        </div>
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Understand any repo before you
          <br />
          <span className="text-signal">write your first line</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-sm text-text-muted sm:text-base">
          CodeLens connects to a GitHub repository, indexes it, and answers your questions
          with the exact files and line numbers it used &mdash; no guessing, no invented APIs.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/signup">
            <Button size="lg" className="group">
              Connect a repository
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              Log in
            </Button>
          </Link>
        </div>
      </section>

      {/* Signature element: the trace line — a literal request path traced left to right */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-28">
        <div className="rounded-xl border border-border bg-surface/70 p-6 backdrop-blur">
          <div className="term-dots mb-6 flex gap-1.5">
            <span className="bg-danger/60" />
            <span className="bg-amber/60" />
            <span className="bg-signal/60" />
          </div>
          <div className="relative grid grid-cols-1 gap-6 sm:grid-cols-4">
            <svg
              className="pointer-events-none absolute left-0 right-0 top-5 hidden h-px w-full sm:block"
              viewBox="0 0 100 1"
              preserveAspectRatio="none"
            >
              <line
                x1="0"
                y1="0.5"
                x2="100"
                y2="0.5"
                stroke="#5EEAD4"
                strokeOpacity="0.35"
                strokeWidth="1"
                strokeDasharray="4 4"
                className="animate-trace-dash"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {traceSteps.map((step, i) => (
              <div key={step.label} className="relative">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-signal/40 bg-ink text-signal font-mono text-xs">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <p className="font-mono text-xs text-signal">{step.label}</p>
                <p className="mt-1 text-xs text-text-muted">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FeatureCard
            icon={Search}
            title="Structure-aware analysis"
            body="Detects languages, dependencies, API routes and the files that actually matter — not every file in the tree."
          />
          <FeatureCard
            icon={GitBranch}
            title="Real architecture, not a template"
            body="The architecture diagram is generated from what's in the repo, so it changes when the repo changes."
          />
          <FeatureCard
            icon={MessageSquareCode}
            title="Cited answers"
            body="Every chat answer ships with the file paths and line ranges it was grounded on, plus a view-code shortcut."
          />
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Search;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <Icon className="h-4 w-4 text-signal" />
      <h3 className="mt-3 font-display text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-text-muted">{body}</p>
    </div>
  );
}
