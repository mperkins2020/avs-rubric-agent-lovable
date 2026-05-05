import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, ChevronUp, ArrowUp, ArrowDown, Minus, X, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SCORE_LABELS: Record<number, string> = { 0: "None", 1: "Partial", 2: "Verified" };


type Band = "Developing" | "Credible" | "Trusted" | "Exemplary";

interface DimensionScore {
  dimension: string;
  score: number | null;
  rationale?: string;
}

interface Strength {
  dimension: string;
  whyItIsStrong: string;
}
interface Weakness {
  dimension: string;
  whatIsMissingOrUnclear: string;
}

interface Company {
  company_name: string;
  domain: string;
  notes: string | null;
  total_score: number | null;
  max_score: number | null;
  total_score_pct: number | null;
  band: Band | null;
  dimension_scores: DimensionScore[] | null;
  model_type_l1: string | null;
  model_type_l2: string | null;
  category_primary: string | null;
  evidence_confidence_score: number | null;
  evidence_coverage_level: "Strong" | "Partial" | "Sparse" | null;
  strengths: Strength[] | null;
  weaknesses: Weakness[] | null;
  analysis_version: string | null;
  scanned_at: string | null;
  prior_total_score: number | null;
  prior_total_score_pct: number | null;
  prior_band: Band | null;
  score_delta: number | null;
  score_delta_pct: number | null;
}

interface CategoryStats {
  total_in_category: number;
  total_scanned: number;
  avg_score_pct: number | null;
  prior_avg_score_pct: number | null;
  band_counts: Record<Band, number>;
  model_type_counts: Record<string, number>;
  avg_score_pct_delta: number | null;
}

interface RunStatus {
  domain: string;
  company_name: string;
  status: string;
  completed_at: string | null;
  error_message: string | null;
}

interface BenchmarkData {
  category: string;
  month: string;
  prior_month: string;
  companies: Company[];
  category_stats: CategoryStats | null;
  run_status: RunStatus[] | null;
}

const CATEGORIES: { slug: string; name: string }[] = [
  { slug: "ai-customer-support", name: "AI Customer Support" },
  { slug: "ai-agent-platform", name: "AI Agent Platform" },
  { slug: "ai-coding-assistant", name: "AI Coding Assistant" },
  { slug: "ai-sales-intelligence", name: "AI Sales Intelligence" },
  { slug: "ai-revenue-intelligence", name: "AI Revenue Intelligence" },
];

const DEFAULT_MONTH = "2026-05";

const slugToName = (slug: string) =>
  CATEGORIES.find((c) => c.slug === slug)?.name ?? CATEGORIES[0].name;
const nameToSlug = (name: string) =>
  CATEGORIES.find((c) => c.name === name)?.slug ?? CATEGORIES[0].slug;

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

function bandColor(band: Band | null | undefined): string {
  switch (band) {
    case "Developing":
      return "text-[hsl(var(--score-low))]";
    case "Credible":
      return "text-[hsl(var(--score-medium))]";
    case "Trusted":
      return "text-[hsl(var(--vt-blue))]";
    case "Exemplary":
      return "text-[hsl(var(--score-high))]";
    default:
      return "text-muted-foreground";
  }
}

function bandBg(band: Band | null | undefined): string {
  switch (band) {
    case "Developing":
      return "bg-[hsl(var(--score-low)/0.12)] text-[hsl(var(--score-low))] border-[hsl(var(--score-low)/0.3)]";
    case "Credible":
      return "bg-[hsl(var(--score-medium)/0.12)] text-[hsl(var(--score-medium))] border-[hsl(var(--score-medium)/0.3)]";
    case "Trusted":
      return "bg-[hsl(var(--vt-blue)/0.12)] text-[hsl(var(--vt-blue))] border-[hsl(var(--vt-blue)/0.3)]";
    case "Exemplary":
      return "bg-[hsl(var(--score-high)/0.12)] text-[hsl(var(--score-high))] border-[hsl(var(--score-high)/0.3)]";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function bandFromPct(pct: number | null | undefined): Band | null {
  if (pct == null) return null;
  if (pct <= 25) return "Developing";
  if (pct <= 50) return "Credible";
  if (pct <= 75) return "Trusted";
  return "Exemplary";
}

function cellColor(score: number | null | undefined): string {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score === 0) return "bg-[hsl(var(--score-low)/0.18)] text-[hsl(var(--score-low))]";
  if (score === 1) return "bg-[hsl(var(--score-medium)/0.18)] text-[hsl(var(--score-medium))]";
  return "bg-[hsl(var(--score-high)/0.18)] text-[hsl(var(--score-high))]";
}

function DeltaPill({ delta }: { delta: number | null | undefined }) {
  if (delta == null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="w-3 h-3" /> —
      </span>
    );
  }
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="w-3 h-3" /> 0pp
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        up ? "text-[hsl(var(--score-high))]" : "text-[hsl(var(--score-low))]",
      )}
    >
      {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {up ? "+" : "−"}
      {Math.abs(delta)}pp
    </span>
  );
}

const BAND_COLORS: Record<Band, string> = {
  Developing: "hsl(var(--score-low))",
  Credible: "hsl(var(--score-medium))",
  Trusted: "hsl(var(--vt-blue))",
  Exemplary: "hsl(var(--score-high))",
};

export default function Benchmark() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();
  const activeSlug = categorySlug ?? nameToSlug("AI Customer Support");
  const activeCategory = slugToName(activeSlug);
  const month = DEFAULT_MONTH;

  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandAll, setExpandAll] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selected, setSelected] = useState<Company | null>(null);

  useEffect(() => {
    document.title = `${activeCategory} Benchmark — ${formatMonth(month)} | ValueTempo`;
  }, [activeCategory, month]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    supabase
      .rpc("get_benchmark_data", { p_category: activeCategory, p_month: month })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setError(error.message);
          setData(null);
        } else {
          setData(data as unknown as BenchmarkData);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCategory, month]);

  const companies = data?.companies ?? [];
  const top8 = companies.slice(0, 8);
  const remaining = companies.slice(8);
  const stats = data?.category_stats ?? null;

  const dimensionList: string[] = useMemo(() => {
    const first = companies.find((c) => c.dimension_scores && c.dimension_scores.length);
    return first?.dimension_scores?.map((d) => d.dimension) ?? [];
  }, [companies]);

  // Bottom row shows each company's total score % (matches leaderboard)
  const dimensionAverages = useMemo(() => {
    return top8.map((c) => c.total_score_pct ?? null);
  }, [top8]);

  const insight = useMemo(() => {
    if (!stats) return null;
    return `${activeCategory} benchmark — ${stats.total_scanned} of ${stats.total_in_category} companies scanned. Category average: ${stats.avg_score_pct ?? "—"}%. Largest group: ${
      Object.entries(stats.band_counts).reduce(
        (best, [band, count]) => (count > best.count ? { band, count } : best),
        { band: "—", count: -1 },
      ).band
    }.`;
  }, [stats, activeCategory]);

  const runningOrErrored = (data?.run_status ?? []).filter(
    (r) => r.status === "running" || r.status === "error",
  );

  const empty =
    !loading && (!companies.length || companies.every((c) => c.total_score == null));

  return (
    <div className="min-h-screen bg-background">

      {/* Zone 1 — Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 pt-8 pb-6">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Category Benchmark</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Public-evidence trust scores by category, refreshed monthly.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-border -mb-px">
            {CATEGORIES.map((c) => {
              const isActive = c.slug === activeSlug;
              return (
                <button
                  key={c.slug}
                  onClick={() => navigate(`/benchmark/${c.slug}`)}
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-2",
                    isActive
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c.name}
                  {isActive && (
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {formatMonth(month)}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            {loading ? (
              <Skeleton className="h-12 w-full" />
            ) : insight ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm text-foreground">
                {insight}
              </div>
            ) : null}
            {runningOrErrored.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                Run status: {runningOrErrored.length} {runningOrErrored.length === 1 ? "company" : "companies"} still{" "}
                {runningOrErrored.some((r) => r.status === "error") ? "with errors" : "running"}.
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {empty ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
            Benchmark data for {activeCategory} {formatMonth(month)} is not yet available. Check
            back after the monthly run completes.
          </div>
        ) : (
          <>
            {/* Zone 2 — Split */}
            <section className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-6">
              {/* Leaderboard */}
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Leaderboard</h2>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-xl" />
                  ))
                ) : (
                  <>
                    {top8.map((c, i) => (
                      <LeaderboardCard
                        key={c.domain}
                        rank={i + 1}
                        company={c}
                        onHover={() => setHoveredIndex(i)}
                        onLeave={() => setHoveredIndex(null)}
                        onClick={() => setSelected(c)}
                        highlighted={hoveredIndex === i}
                      />
                    ))}

                    {/* Pinned average */}
                    {stats && (
                      <div className="rounded-xl bg-muted/60 border border-border px-4 py-3 flex items-center justify-between">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            Category Average
                          </div>
                          <div className="text-sm text-foreground mt-0.5">
                            {stats.total_scanned} companies
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-2xl font-semibold text-foreground tabular-nums">
                            {stats.avg_score_pct ?? "—"}%
                          </div>
                          <DeltaPill delta={stats.avg_score_pct_delta} />
                        </div>
                      </div>
                    )}

                    {/* Show all */}
                    {remaining.length > 0 && (
                      <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <button
                          onClick={() => setExpandAll((v) => !v)}
                          className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium hover:bg-muted/40 transition-colors"
                        >
                          <span>
                            {expandAll ? "Hide" : "Show all"} {companies.length} companies
                          </span>
                          {expandAll ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        {expandAll && (
                          <div className="border-t border-border divide-y divide-border">
                            {remaining.map((c, i) => (
                              <button
                                key={c.domain}
                                onClick={() => setSelected(c)}
                                className="w-full px-4 py-2.5 grid grid-cols-[2rem_1fr_auto_auto_auto] items-center gap-3 text-sm hover:bg-muted/40 text-left"
                              >
                                <span className="text-muted-foreground tabular-nums">
                                  {i + 9}
                                </span>
                                <span className="font-medium text-foreground truncate">
                                  {c.company_name}
                                </span>
                                <span
                                  className={cn(
                                    "tabular-nums font-semibold",
                                    bandColor(c.band),
                                  )}
                                >
                                  {c.total_score_pct ?? "—"}%
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn("text-[10px]", bandBg(c.band))}
                                >
                                  {c.band ?? "—"}
                                </Badge>
                                <DeltaPill delta={c.score_delta_pct} />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Heatmap */}
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Dimension Heatmap</h2>
                <div className="rounded-xl border border-border bg-card p-4 overflow-x-auto">
                  {loading ? (
                    <div className="grid gap-1" style={{ gridTemplateColumns: `12rem repeat(8, minmax(2rem, 1fr))` }}>
                      {Array.from({ length: 9 * 9 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                      ))}
                    </div>
                  ) : (
                    <Heatmap
                      dimensions={dimensionList}
                      companies={top8}
                      dimensionAverages={dimensionAverages}
                      hoveredIndex={hoveredIndex}
                      setHoveredIndex={setHoveredIndex}
                    />
                  )}
                </div>
              </div>
            </section>

            {/* Zone 3 — Pulse */}
            {stats && (
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PulseCard label="Category average" sub={`${stats.total_scanned} of ${stats.total_in_category} companies scanned`}>
                  <div className="flex items-center gap-3">
                    <div className="text-4xl font-semibold tabular-nums">
                      {stats.avg_score_pct ?? "—"}%
                    </div>
                    <DeltaPill delta={stats.avg_score_pct_delta} />
                  </div>
                </PulseCard>

                <PulseCard label="Band distribution" sub="Maturity mix">
                  <BandStackedBar counts={stats.band_counts} />
                </PulseCard>

                <PulseCard label="Pricing model mix" sub="Categorization (L1)">
                  <ModelMix counts={stats.model_type_counts} />
                </PulseCard>
              </section>
            )}
          </>
        )}
      </main>

      {/* Detail panel */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-[40vw] overflow-y-auto">
          {selected && (
            <CompanyDetail
              company={selected}
              categoryAvgPct={stats?.avg_score_pct ?? null}
              onClose={() => setSelected(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {error && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-destructive text-destructive-foreground px-4 py-2 text-sm shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}

function LeaderboardCard({
  rank,
  company,
  onHover,
  onLeave,
  onClick,
  highlighted,
}: {
  rank: number;
  company: Company;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
  highlighted: boolean;
}) {
  return (
    <button
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border bg-card p-4 transition-all",
        "hover:shadow-[var(--shadow-sm)] hover:border-primary/40",
        highlighted ? "border-primary/60 shadow-[var(--shadow-sm)]" : "border-border",
      )}
    >
      <div className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-4">
        <div className="text-3xl font-light text-muted-foreground tabular-nums text-center">
          {rank}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-foreground truncate">{company.company_name}</div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <Badge variant="outline" className={cn("text-[10px]", bandBg(company.band))}>
              {company.band ?? "—"}
            </Badge>
            <DeltaPill delta={company.score_delta_pct} />
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
            {company.model_type_l1 && (
              <span className="px-2 py-0.5 rounded-full bg-muted">{company.model_type_l1}</span>
            )}
            {company.evidence_coverage_level && (
              <span className="px-2 py-0.5 rounded-full bg-muted">
                Evidence: {company.evidence_coverage_level}
              </span>
            )}
          </div>
        </div>
        <div className={cn("text-4xl font-bold tabular-nums", bandColor(company.band))}>
          {company.total_score_pct ?? "—"}
          <span className="text-xl font-medium">%</span>
        </div>
      </div>
    </button>
  );
}

function Heatmap({
  dimensions,
  companies,
  dimensionAverages,
  hoveredIndex,
  setHoveredIndex,
}: {
  dimensions: string[];
  companies: Company[];
  dimensionAverages: (number | null)[];
  hoveredIndex: number | null;
  setHoveredIndex: (i: number | null) => void;
}) {
  const cols = companies.length || 1;
  return (
    <div
      className="grid gap-1 min-w-[28rem]"
      style={{ gridTemplateColumns: `9rem repeat(${cols}, minmax(2rem, 1fr))` }}
    >
      {/* header row */}
      <div />
      {companies.map((c, i) => (
        <div
          key={c.domain}
          onMouseEnter={() => setHoveredIndex(i)}
          onMouseLeave={() => setHoveredIndex(null)}
          className={cn(
            "text-[10px] font-medium text-center text-muted-foreground truncate px-1 py-1 rounded",
            hoveredIndex === i && "bg-primary/10 text-foreground",
          )}
          title={c.company_name}
        >
          {c.company_name.slice(0, 8)}
        </div>
      ))}

      {dimensions.map((dim) => (
        <Fragment key={`row-${dim}`}>
          <div
            className="text-xs text-foreground py-2 pr-2 truncate"
            title={dim}
          >
            {dim}
          </div>
          {companies.map((c, i) => {
            const ds = c.dimension_scores?.find((d) => d.dimension === dim);
            const score = ds?.score ?? null;
            return (
              <Tooltip key={`${dim}-${c.domain}`}>
                <TooltipTrigger asChild>
                  <div
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className={cn(
                      "h-9 flex items-center justify-center text-sm font-semibold tabular-nums rounded transition-all cursor-default",
                      cellColor(score),
                      hoveredIndex === i && "ring-2 ring-primary/50",
                    )}
                  >
                    {score ?? "—"}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="font-semibold">{c.company_name}</div>
                  <div className="text-xs text-muted-foreground">{dim}</div>
                  <div className="text-xs mt-1">Score: {score ?? "—"}</div>
                  {ds?.rationale && <div className="text-xs mt-1">{ds.rationale}</div>}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </Fragment>
      ))}

      {/* avg row */}
      <div className="text-xs font-semibold text-muted-foreground pt-2 pr-2 border-t border-border">
        Total score
      </div>
      {dimensionAverages.map((avg, i) => (
        <div
          key={`avg-${i}`}
          className="h-9 mt-1 flex items-center justify-center text-xs font-semibold text-muted-foreground border-t border-border"
        >
          {avg != null ? `${avg}%` : "—"}
        </div>
      ))}
    </div>
  );
}

function PulseCard({
  label,
  sub,
  children,
}: {
  label: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-3">{children}</div>
      <div className="text-xs text-muted-foreground mt-3">{sub}</div>
    </div>
  );
}

function BandStackedBar({ counts }: { counts: Record<Band, number> }) {
  const order: Band[] = ["Developing", "Credible", "Trusted", "Exemplary"];
  const total = order.reduce((a, b) => a + (counts[b] ?? 0), 0);
  if (!total) return <div className="text-sm text-muted-foreground">No data</div>;
  return (
    <div className="space-y-2">
      <div className="flex h-8 w-full rounded-md overflow-hidden border border-border">
        {order.map((b) => {
          const n = counts[b] ?? 0;
          if (!n) return null;
          const pct = (n / total) * 100;
          return (
            <div
              key={b}
              className="flex items-center justify-center text-[11px] font-semibold text-white"
              style={{ width: `${pct}%`, backgroundColor: BAND_COLORS[b] }}
              title={`${b}: ${n}`}
            >
              {n}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {order.map((b) => (
          <span key={b} className="inline-flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-sm"
              style={{ backgroundColor: BAND_COLORS[b] }}
            />
            {b}
          </span>
        ))}
      </div>
    </div>
  );
}

function ModelMix({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts).filter(([, v]) => v > 0);
  if (!entries.length) return <div className="text-sm text-muted-foreground">No data</div>;
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([k, v]) => (
        <span
          key={k}
          className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs"
        >
          <span className="font-medium capitalize">{k}</span>
          <span className="text-muted-foreground tabular-nums">{v}</span>
        </span>
      ))}
    </div>
  );
}

function CompanyDetail({
  company,
  categoryAvgPct,
  onClose,
}: {
  company: Company;
  categoryAvgPct: number | null;
  onClose: () => void;
}) {
  const dims = company.dimension_scores ?? [];
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{company.company_name}</h2>
          <a
            href={`https://${company.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            {company.domain}
          </a>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Score</div>
          <div className={cn("text-3xl font-bold mt-1 tabular-nums", bandColor(company.band))}>
            {company.total_score_pct ?? "—"}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">{company.band ?? "—"}</div>
        </div>
        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Category avg</div>
          <div className="text-3xl font-bold mt-1 tabular-nums text-foreground">
            {categoryAvgPct ?? "—"}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {bandFromPct(categoryAvgPct) ?? ""}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Dimensions</h3>
        <div className="space-y-2">
          {dims.map((d) => {
            const pct = d.score != null ? (d.score / 2) * 100 : null;
            const color =
              d.score === 2
                ? "hsl(var(--score-high))"
                : d.score === 1
                ? "hsl(var(--score-medium))"
                : d.score === 0
                ? "hsl(var(--score-low))"
                : "hsl(var(--muted))";
            return (
              <div key={d.dimension} className="grid grid-cols-[1fr_auto] gap-3 items-center">
                <div>
                  <div className="text-xs text-foreground mb-1">{d.dimension}</div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct ?? 0}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
                <div className="text-xs font-semibold tabular-nums text-muted-foreground w-12 text-right">
                  {pct != null ? `${Math.round(pct)}%` : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {company.strengths && company.strengths.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[hsl(var(--score-high))] mb-2">Strengths</h3>
          <ul className="space-y-2">
            {company.strengths.slice(0, 2).map((s, i) => (
              <li key={i} className="text-sm text-foreground rounded-lg bg-[hsl(var(--score-high)/0.08)] border border-[hsl(var(--score-high)/0.2)] p-3">
                <div className="text-xs font-medium text-muted-foreground mb-1">{s.dimension}</div>
                {s.whyItIsStrong}
              </li>
            ))}
          </ul>
        </div>
      )}

      {company.weaknesses && company.weaknesses.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[hsl(var(--score-medium))] mb-2">Weaknesses</h3>
          <ul className="space-y-2">
            {company.weaknesses.slice(0, 2).map((w, i) => (
              <li key={i} className="text-sm text-foreground rounded-lg bg-[hsl(var(--score-medium)/0.08)] border border-[hsl(var(--score-medium)/0.2)] p-3">
                <div className="text-xs font-medium text-muted-foreground mb-1">{w.dimension}</div>
                {w.whatIsMissingOrUnclear}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-xs text-muted-foreground border-t border-border pt-3 flex flex-wrap gap-x-3 gap-y-1">
        {company.scanned_at && (
          <span>
            Scanned{" "}
            {new Date(company.scanned_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        )}
        {company.evidence_coverage_level && (
          <span>· Evidence Coverage: {company.evidence_coverage_level}</span>
        )}
        {company.analysis_version && <span>· v{company.analysis_version}</span>}
      </div>
    </div>
  );
}
