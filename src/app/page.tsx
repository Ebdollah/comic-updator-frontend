"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  ApiError,
  type FeedPage,
  type FeedSort,
  type SeriesSummary,
  type SourceInfo,
  type StatusResponse,
} from "@/lib/api";
import { monthKey, monthLabel, shiftMonth } from "@/lib/format";
import RefreshButton from "@/components/RefreshButton";
import SeriesCard from "@/components/SeriesCard";
import StatusBar from "@/components/StatusBar";

const SORTS: { key: FeedSort; label: string }[] = [
  { key: "newest", label: "Newest debut" },
  { key: "updated", label: "Recently updated" },
  { key: "chapters", label: "Most chapters" },
  { key: "name", label: "Name" },
];

const PAGE_SIZE = 24;

interface Feed {
  /** The request this answers; see requestKey. */
  key: string;
  source: string;
  items: SeriesSummary[];
  meta: Omit<FeedPage, "items" | "offset"> | null;
  error: string | null;
}

const EMPTY_FEED: Feed = { key: "", source: "", items: [], meta: null, error: null };

const message = (e: unknown, fallback: string) =>
  e instanceof ApiError ? e.message : fallback;

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

export default function Dashboard() {
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [source, setSource] = useState<string>("vortexscans");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<FeedSort>("newest");
  const [month, setMonth] = useState("all");
  // Bumped after a refresh to refetch the feed and status, filters unchanged.
  const [reloadKey, setReloadKey] = useState(0);

  // Filtering is server side now, so wait for a pause in typing.
  const q = useDebounced(query.trim(), 300);

  // "This month" must follow the calendar, not the newest stored record —
  // a quiet month would otherwise silently relabel an older one as current.
  const thisMonth = monthKey(new Date().toISOString());
  const lastMonth = shiftMonth(thisMonth, -1);
  const target =
    month === "current"
      ? thisMonth
      : month === "previous"
        ? lastMonth
        : month === "all"
          ? undefined
          : month;
  const active = sources.find((s) => s.id === source);

  // Every result is tagged with the request it answers. "Loading" is then
  // just "the latest answer is for some other request", and a late reply to
  // an abandoned filter can never land on top of the current one.
  const requestKey = [source, sort, target ?? "", q, reloadKey].join("|");
  const [feed, setFeed] = useState<Feed>(EMPTY_FEED);
  const [more, setMore] = useState({ key: "", loading: false, error: null as string | null });
  const [statusOf, setStatusOf] = useState<{ source: string; status: StatusResponse | null }>();
  const moreAbort = useRef<AbortController | null>(null);
  const pendingMore = useRef<string | null>(null);

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
    let live = true;
    // Status is best-effort: a stale status bar shouldn't hide the series.
    api.getStatus(source).then(
      (status) => live && setStatusOf({ source, status }),
      () => live && setStatusOf({ source, status: null }),
    );
    return () => {
      live = false;
    };
  }, [source, reloadKey]);

  // First page, whenever the source or a filter changes.
  useEffect(() => {
    const ctrl = new AbortController();
    moreAbort.current?.abort();
    api.feed(source, { sort, month: target, q, limit: PAGE_SIZE }, ctrl.signal).then(
      ({ items, ...meta }) => {
        if (!ctrl.signal.aborted) {
          setFeed({ key: requestKey, source, items, meta, error: null });
        }
      },
      (e) => {
        if (!ctrl.signal.aborted) {
          setFeed((prev) => ({ ...prev, key: requestKey, error: message(e, "Failed to load data") }));
        }
      },
    );
    return () => ctrl.abort();
  }, [requestKey, source, sort, target, q]);

  const loading = feed.key !== requestKey;
  const error = loading ? null : feed.error;
  // Month counts don't depend on the filters, so keep showing them while a
  // new filter loads; only a different tab's numbers are hidden.
  const current = feed.source === source ? feed.meta : null;
  const items = feed.source === source ? feed.items : [];
  const nextOffset = loading || error ? null : (current?.next_offset ?? null);
  const loadingMore = more.key === requestKey && more.loading;
  const moreError = more.key === requestKey ? more.error : null;
  const status = statusOf?.source === source ? statusOf.status : null;

  const loadMore = useCallback(async () => {
    if (nextOffset == null) return;
    // The observer can fire twice before a re-render; one fetch per page.
    const tag = `${requestKey}@${nextOffset}`;
    if (pendingMore.current === tag) return;
    pendingMore.current = tag;

    const key = requestKey;
    const ctrl = new AbortController();
    moreAbort.current = ctrl;
    setMore({ key, loading: true, error: null });
    try {
      const { items: page, ...meta } = await api.feed(
        source,
        { sort, month: target, q, limit: PAGE_SIZE, offset: nextOffset },
        ctrl.signal,
      );
      // A scrape between pages can shift the order by a slot or two; never
      // show the same card twice because of it.
      setFeed((prev) => {
        if (prev.key !== key) return prev;
        const seen = new Set(prev.items.map((s) => s.slug));
        return { ...prev, meta, items: [...prev.items, ...page.filter((s) => !seen.has(s.slug))] };
      });
      setMore({ key, loading: false, error: null });
    } catch (e) {
      if (!ctrl.signal.aborted) {
        setMore({ key, loading: false, error: message(e, "Failed to load more") });
      }
    } finally {
      if (pendingMore.current === tag) pendingMore.current = null;
    }
  }, [nextOffset, requestKey, source, sort, target, q]);

  // Infinite scroll: fetch the next page as the end of the list nears. The
  // observer is rebuilt after every page, and a fresh observer reports the
  // sentinel's current state at once — so a screen tall enough to show the
  // whole page keeps loading until it is filled.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || nextOffset == null || moreError) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, nextOffset, moreError]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const months = current?.months ?? [];
  const countFor = (key: string) =>
    months.find((m) => m.month === key)?.count ?? 0;
  const showSkeleton = loading && !current;
  const filtered = Boolean(target || q);

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
        <RefreshButton onDone={reload} />
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
          { key: "all", label: "All", count: current?.all_count ?? 0 },
          { key: "current", label: "This month", count: countFor(thisMonth) },
          { key: "previous", label: "Last month", count: countFor(lastMonth) },
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
          {months.map(({ month: key, count }) => (
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
        {showSkeleton ? (
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
              onClick={reload}
              className="mt-3 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:border-accent"
            >
              Try again
            </button>
          </div>
        ) : items.length === 0 && !loading ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
            <p className="font-medium">
              {!current?.all_count
                ? "No series stored yet"
                : "Nothing matches these filters"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {!current?.all_count
                ? "Hit Refresh now to check every site for series that debuted this month."
                : month === "current"
                  ? `Nothing debuted in ${monthLabel(thisMonth)} yet — the site adds titles in batches.`
                  : "Try a different month or clear the name filter."}
            </p>
            {filtered && (
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
              Showing {items.length} of {current?.total ?? items.length}
              {loading && " · updating…"}
            </p>
            <div
              className={`grid gap-4 transition-opacity sm:grid-cols-2 ${
                loading ? "opacity-60" : ""
              }`}
            >
              {items.map((s) => (
                <SeriesCard key={s.slug} series={s} source={source} />
              ))}
              {loadingMore &&
                [0, 1].map((i) => (
                  <div
                    key={`more-${i}`}
                    className="h-[156px] animate-pulse rounded-xl border border-border bg-surface"
                  />
                ))}
            </div>

            <div ref={sentinel} aria-hidden="true" />

            {moreError ? (
              <div className="mt-5 flex flex-col items-center gap-2 text-sm">
                <p className="text-accent">{moreError}</p>
                <button
                  onClick={() => void loadMore()}
                  className="rounded-lg border border-border px-3 py-1.5 font-medium hover:border-accent"
                >
                  Load more
                </button>
              </div>
            ) : (
              nextOffset == null &&
              !loading &&
              items.length > PAGE_SIZE && (
                <p className="mt-6 text-center text-xs text-muted">
                  That&apos;s everything — {items.length} series.
                </p>
              )
            )}
          </>
        )}
      </section>
    </main>
  );
}
