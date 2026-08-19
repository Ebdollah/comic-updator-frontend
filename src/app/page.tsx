"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  ApiError,
  type SourceInfo,
  type StatusResponse,
  type VortexSeries,
} from "@/lib/api";
import { monthKey, monthLabel, shiftMonth } from "@/lib/format";
import RefreshButton from "@/components/RefreshButton";
import SeriesCard from "@/components/SeriesCard";
import StatusBar from "@/components/StatusBar";

type SortKey = "newest" | "updated" | "chapters" | "name";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest debut" },
  { key: "updated", label: "Recently updated" },
  { key: "chapters", label: "Most chapters" },
  { key: "name", label: "Name" },
];

function time(iso: string | null): number {
  return iso ? new Date(iso).getTime() : 0;
}

export default function Dashboard() {
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [source, setSource] = useState<string>("vortexscans");
  const [series, setSeries] = useState<VortexSeries[]>([]);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [month, setMonth] = useState("all");

  const load = useCallback(async () => {
    setError(null);
    try {
      // Status is best-effort: a stale status bar shouldn't hide the series.
      const [list, stat] = await Promise.all([
        api.listSeries(source),
        api.getStatus(source).catch(() => null),
      ]);
      setSeries(list);
      setStatus(stat);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [source]);

  // Tabs come from the backend registry, so adding a source there adds a tab.
  useEffect(() => {
    api
      .listSources()
      .then((list) => {
        setSources(list);
        if (list.length && !list.some((s) => s.id === source)) {
          setSource(list[0].id);
        }
      })
      .catch(() => setSources([]));
    // Only needs to run once; `source` is validated inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLoading(true);
    setSeries([]);
    void load();
  }, [load]);

  // Months present in the data, newest first, with a count for each.
  const months = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of series) {
      const key = monthKey(s.first_chapter_released_at);
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [series]);

  // "This month" must follow the calendar, not the newest stored record —
  // a quiet month would otherwise silently relabel an older one as current.
  const thisMonth = monthKey(new Date().toISOString());
  const lastMonth = shiftMonth(thisMonth, -1);
  const active = sources.find((s) => s.id === source);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = q
      ? series.filter((s) => s.name.toLowerCase().includes(q))
      : series;

    const target =
      month === "current" ? thisMonth : month === "previous" ? lastMonth : month;
    if (target !== "all") {
      filtered = filtered.filter(
        (s) => monthKey(s.first_chapter_released_at) === target,
      );
    }

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "newest":
          return (
            time(b.first_chapter_released_at) - time(a.first_chapter_released_at)
          );
        case "updated":
          return time(b.last_updated_at) - time(a.last_updated_at);
        case "chapters":
          return b.total_chapters - a.total_chapters;
        case "name":
          return a.name.localeCompare(b.name);
      }
    });
  }, [series, query, sort, month, thisMonth, lastMonth]);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
            {active?.site ?? "—"}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Comic Updator
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            {active?.notes ??
              "Series whose first chapter dropped this month, stored once."}
          </p>
        </div>
        <RefreshButton source={source} onDone={load} />
      </header>

      {sources.length > 1 && (
        <div
          role="tablist"
          aria-label="Source"
          className="mb-6 flex gap-1 border-b border-border"
        >
          {sources.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={s.id === source}
              onClick={() => setSource(s.id)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                s.id === source
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <StatusBar status={status} />

      <div className="mt-7 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
          Debut month
        </span>
        {[
          { key: "all", label: "All", count: series.length },
          {
            key: "current",
            label: "This month",
            count: months.find(([m]) => m === thisMonth)?.[1] ?? 0,
          },
          {
            key: "previous",
            label: "Last month",
            count: months.find(([m]) => m === lastMonth)?.[1] ?? 0,
          },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => setMonth(opt.key)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              month === opt.key
                ? "border-accent bg-accent text-white"
                : "border-border bg-surface text-muted hover:text-foreground"
            }`}
          >
            {opt.label}
            <span className="ml-1.5 tabular-nums opacity-70">{opt.count}</span>
          </button>
        ))}

        <select
          value={["all", "current", "previous"].includes(month) ? "" : month}
          onChange={(e) => setMonth(e.target.value || "all")}
          aria-label="Jump to a specific debut month"
          className={`rounded-lg border bg-surface px-3 py-1.5 text-xs font-medium outline-none focus:border-accent ${
            ["all", "current", "previous"].includes(month)
              ? "border-border text-muted"
              : "border-accent text-foreground"
          }`}
        >
          <option value="">Specific month…</option>
          {months.map(([key, count]) => (
            <option key={key} value={key}>
              {monthLabel(key)} ({count})
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name…"
          aria-label="Filter series by name"
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
        />
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                sort === s.key
                  ? "bg-accent text-white"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <section className="mt-5">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[156px] animate-pulse rounded-xl border border-border bg-surface"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-border bg-accent-soft p-6">
            <h2 className="font-semibold text-accent">Couldn&apos;t load series</h2>
            <p className="mt-1 text-sm text-muted">{error}</p>
            <button
              onClick={load}
              className="mt-3 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:border-accent"
            >
              Try again
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
            <p className="font-medium">
              {series.length === 0
                ? "No series stored yet"
                : "Nothing matches these filters"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {series.length === 0
                ? "Hit Refresh now to check the site for series that debuted this month."
                : month === "current"
                  ? `Nothing debuted in ${monthLabel(thisMonth)} yet — the site adds titles in batches.`
                  : "Try a different month or clear the name filter."}
            </p>
            {series.length > 0 && (
              <button
                onClick={() => {
                  setMonth("all");
                  setQuery("");
                }}
                className="mt-3 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:border-accent"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted">
              Showing {visible.length} of {series.length}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {visible.map((s) => (
                <SeriesCard key={s.slug} series={s} source={source} />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
