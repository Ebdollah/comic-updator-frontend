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
import DebutMonthPicker from "@/components/DebutMonthPicker";
import {
  Search,
  X,
  LayoutGrid,
  List,
  Sparkles,
  Zap,
  Flame,
  ArrowUpDown,
  Calendar,
  Bookmark,
  ChevronUp,
  Layers,
  SlidersHorizontal,
} from "lucide-react";

const SORTS: { key: FeedSort; label: string }[] = [
  { key: "newest", label: "Newest Debut" },
  { key: "updated", label: "Recently Updated" },
  { key: "chapters", label: "Most Chapters" },
  { key: "name", label: "Name" },
];

const PAGE_SIZE = 30;

interface Feed {
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
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [onlyBookmarks, setOnlyBookmarks] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load bookmarks & viewMode from localStorage on mount
  useEffect(() => {
    try {
      const savedBm = localStorage.getItem("comic_bookmarks");
      if (savedBm) setBookmarks(JSON.parse(savedBm));
      const savedVm = localStorage.getItem("comic_view_mode") as "grid" | "list";
      if (savedVm === "grid" || savedVm === "list") setViewMode(savedVm);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const toggleBookmark = useCallback((slug: string) => {
    setBookmarks((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      try {
        localStorage.setItem("comic_bookmarks", JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const changeViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    try {
      localStorage.setItem("comic_view_mode", mode);
    } catch {
      // Ignore
    }
  };

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Show scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const q = useDebounced(query.trim(), 280);

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

  const requestKey = [source, sort, target ?? "", q, reloadKey].join("|");
  const [feed, setFeed] = useState<Feed>(EMPTY_FEED);
  const [more, setMore] = useState({ key: "", loading: false, error: null as string | null });
  const [statusOf, setStatusOf] = useState<{ source: string; status: StatusResponse | null }>();
  const moreAbort = useRef<AbortController | null>(null);
  const pendingMore = useRef<string | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let live = true;
    api.getStatus(source).then(
      (status) => live && setStatusOf({ source, status }),
      () => live && setStatusOf({ source, status: null }),
    );
    return () => {
      live = false;
    };
  }, [source, reloadKey]);

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
  const current = feed.source === source ? feed.meta : null;
  let items = feed.source === source ? feed.items : [];

  // Client-side quick filter for Type (Manhwa/Manhua) and Bookmarks
  if (typeFilter !== "all") {
    items = items.filter((s) =>
      s.type?.toLowerCase().includes(typeFilter.toLowerCase()),
    );
  }
  if (onlyBookmarks) {
    items = items.filter((s) => bookmarks.includes(s.slug));
  }

  const nextOffset = loading || error ? null : (current?.next_offset ?? null);
  const loadingMore = more.key === requestKey && more.loading;
  const moreError = more.key === requestKey ? more.error : null;
  const status = statusOf?.source === source ? statusOf.status : null;

  const loadMore = useCallback(async () => {
    if (nextOffset == null) return;
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
  const filtered = Boolean(target || q || typeFilter !== "all" || onlyBookmarks);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* -------------------------------------------------------------
          TOP BAR & HERO HEADER
      ------------------------------------------------------------- */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-600 shadow-lg shadow-rose-500/30">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                Comic <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-400">Updator</span>
              </h1>
              <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent border border-rose-500/20">
                PRO
              </span>
            </div>
            <p className="text-xs text-muted">
              Live tracking & cloud backup for new series debuts · {active?.site ?? "Active Site"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <RefreshButton onDone={reload} />
        </div>
      </header>

      {/* -------------------------------------------------------------
          SOURCE TABS (VORTEX SCANS vs THUNDER SCANS)
      ------------------------------------------------------------- */}
      {sources.length > 1 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Source"
            className="flex items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-surface/80 p-1.5 backdrop-blur-md"
          >
            {sources.map((s) => {
              const isActive = s.id === source;
              const isThunder = s.id.includes("thunder");
              return (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setSource(s.id);
                    setMonth("all");
                    setTypeFilter("all");
                  }}
                  className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/25"
                      : "text-muted hover:text-foreground hover:bg-white/[0.04]"
                  }`}
                >
                  {isThunder ? (
                    <Zap className="h-3.5 w-3.5" />
                  ) : (
                    <Flame className="h-3.5 w-3.5" />
                  )}
                  <span>{s.name}</span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-muted flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-ok animate-pulse" />
            <span>{active?.notes ?? "Chapter 1 tracked monthly, stored with CDN backup."}</span>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          METRIC STATUS STRIP (4 Glass Cards)
      ------------------------------------------------------------- */}
      <StatusBar status={status} />

      {/* -------------------------------------------------------------
          FILTER & TOOLBAR CONTROL CENTER
      ------------------------------------------------------------- */}
      <div className="mt-8 space-y-3.5 rounded-2xl border border-white/[0.08] bg-surface/60 p-4 backdrop-blur-md shadow-xl">
        {/* Row 1: Search & Sorter & View Mode */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search comics by title… (Press '/' to focus)"
              aria-label="Filter series by name"
              className="w-full rounded-xl border border-white/[0.08] bg-surface-2/80 py-2.5 pl-10 pr-10 text-xs font-medium text-foreground outline-none transition-all placeholder:text-muted focus:border-accent focus:bg-surface-2 focus:ring-1 focus:ring-accent"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Sorter Selector */}
          <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-surface-2/60 p-1">
            <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted hidden sm:inline-flex items-center gap-1">
              <ArrowUpDown className="h-3 w-3" /> Sort
            </span>
            {SORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                  sort === s.key
                    ? "bg-accent text-white shadow-sm"
                    : "text-muted hover:text-foreground hover:bg-white/[0.04]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* View Mode Switcher (Grid vs List) */}
          <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-surface-2/60 p-1">
            <button
              onClick={() => changeViewMode("grid")}
              title="Poster Grid View"
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-white/[0.04]"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => changeViewMode("list")}
              title="Compact List View"
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-white/[0.04]"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Row 2: Debut Month Pills & Type Filter & Bookmarks */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-white/[0.05] pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted mr-1">
              <Calendar className="h-3 w-3" /> Debut Month:
            </span>

            {[
              { key: "all", label: "All Months", count: current?.all_count ?? 0 },
              { key: "current", label: "This Month", count: countFor(thisMonth) },
              { key: "previous", label: "Last Month", count: countFor(lastMonth) },
            ].map((opt) => {
              const isSelected = month === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setMonth(opt.key)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                    isSelected
                      ? "border-accent bg-accent text-white shadow-sm shadow-accent/30"
                      : "border-white/[0.08] bg-surface-2/70 text-muted hover:border-white/20 hover:text-foreground"
                  }`}
                >
                  <span>{opt.label}</span>
                  <span
                    className={`rounded-md px-1.5 py-0.2 text-[10px] font-bold tabular-nums ${
                      isSelected ? "bg-white/25 text-white" : "bg-white/[0.06] text-muted-light"
                    }`}
                  >
                    {opt.count}
                  </span>
                </button>
              );
            })}

            {/* Dynamic Year & Month Archive Picker */}
            <DebutMonthPicker
              months={months}
              selectedMonth={month}
              onSelect={(m) => setMonth(m)}
              thisMonthKey={thisMonth}
              lastMonthKey={lastMonth}
              allCount={current?.all_count ?? 0}
            />
          </div>

          {/* Quick Sub-filters (Type & Bookmarks) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Manhwa / Manhua filter */}
            <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-surface-2/60 p-1">
              {["all", "Manhwa", "Manhua"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    typeFilter === t
                      ? "bg-white/10 text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {t === "all" ? "All Types" : t}
                </button>
              ))}
            </div>

            {/* Bookmarks Toggle */}
            <button
              onClick={() => setOnlyBookmarks((b) => !b)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                onlyBookmarks
                  ? "border-accent bg-accent/20 text-accent"
                  : "border-white/[0.08] bg-surface-2/60 text-muted hover:text-foreground"
              }`}
            >
              <Bookmark className={`h-3.5 w-3.5 ${onlyBookmarks ? "fill-accent" : ""}`} />
              <span>Saved ({bookmarks.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          RESULTS SECTION & COMIC CARDS
      ------------------------------------------------------------- */}
      <section className="mt-7">
        {showSkeleton ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                : "grid grid-cols-1 md:grid-cols-2 gap-4"
            }
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`skeleton-shimmer rounded-2xl border border-white/5 bg-surface/50 ${
                  viewMode === "grid" ? "aspect-[3/4.8]" : "h-[156px]"
                }`}
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center backdrop-blur-md">
            <h2 className="text-base font-bold text-accent">Unable to fetch comic feed</h2>
            <p className="mt-1 text-sm text-muted">{error}</p>
            <button
              onClick={reload}
              className="mt-4 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-accent-hover transition-colors"
            >
              Retry
            </button>
          </div>
        ) : items.length === 0 && !loading ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-surface/40 p-12 text-center backdrop-blur-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-muted">
              <SlidersHorizontal className="h-6 w-6" />
            </div>
            <p className="mt-4 text-base font-bold text-foreground">
              {!current?.all_count
                ? "No series stored yet"
                : "No comics match the selected criteria"}
            </p>
            <p className="mx-auto mt-1.5 max-w-md text-xs text-muted">
              {!current?.all_count
                ? "Click 'Scan for Updates' to fetch debut series for this month."
                : onlyBookmarks
                  ? "You haven't bookmarked any comics matching these filters yet. Click the bookmark icon on any card to save it."
                  : "Try clearing your search query or selecting a different debut month."}
            </p>
            {filtered && (
              <button
                onClick={() => {
                  setMonth("all");
                  setQuery("");
                  setTypeFilter("all");
                  setOnlyBookmarks(false);
                }}
                className="mt-4 rounded-xl border border-white/10 bg-surface-2 px-4 py-2 text-xs font-semibold text-foreground hover:border-accent hover:text-accent transition-all"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between text-xs text-muted">
              <p>
                Showing <strong className="font-semibold text-foreground">{items.length}</strong> of{" "}
                <strong className="font-semibold text-foreground">{current?.total ?? items.length}</strong> series
                {loading && " · updating…"}
              </p>
              {filtered && (
                <button
                  onClick={() => {
                    setMonth("all");
                    setQuery("");
                    setTypeFilter("all");
                    setOnlyBookmarks(false);
                  }}
                  className="text-accent hover:underline text-[11px] font-medium"
                >
                  Clear active filters
                </button>
              )}
            </div>

            {/* Grid vs List layout */}
            <div
              className={`transition-opacity duration-200 ${
                viewMode === "grid"
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                  : "grid grid-cols-1 md:grid-cols-2 gap-4"
              } ${loading ? "opacity-60" : ""}`}
            >
              {items.map((s) => (
                <SeriesCard
                  key={s.slug}
                  series={s}
                  source={source}
                  viewMode={viewMode}
                  isBookmarked={bookmarks.includes(s.slug)}
                  onToggleBookmark={toggleBookmark}
                />
              ))}

              {/* Shimmer loading more cards */}
              {loadingMore &&
                Array.from({ length: viewMode === "grid" ? 6 : 2 }).map((_, i) => (
                  <div
                    key={`more-${i}`}
                    className={`skeleton-shimmer rounded-2xl border border-white/5 bg-surface/50 ${
                      viewMode === "grid" ? "aspect-[3/4.8]" : "h-[156px]"
                    }`}
                  />
                ))}
            </div>

            {/* Infinite Scroll Sentinel */}
            <div ref={sentinel} aria-hidden="true" className="h-4" />

            {/* More / Pagination Status */}
            {moreError ? (
              <div className="mt-8 flex flex-col items-center gap-2 text-xs">
                <p className="text-accent">{moreError}</p>
                <button
                  onClick={() => void loadMore()}
                  className="rounded-xl border border-white/10 bg-surface-2 px-4 py-2 font-semibold hover:border-accent"
                >
                  Load Next Page
                </button>
              </div>
            ) : (
              nextOffset == null &&
              !loading &&
              items.length > PAGE_SIZE && (
                <div className="mt-10 flex items-center justify-center gap-2 text-xs text-muted">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  <span>You have reached the end · {items.length} series displayed</span>
                </div>
              )
            )}
          </>
        )}
      </section>

      {/* -------------------------------------------------------------
          SCROLL TO TOP FLOATING BUTTON
      ------------------------------------------------------------- */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-2xl bg-surface/90 border border-white/15 text-foreground shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-accent hover:text-accent active:scale-95"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}
    </main>
  );
}
