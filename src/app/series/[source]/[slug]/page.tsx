"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, useMemo } from "react";
import { api, ApiError, coverSrc, type VortexSeries } from "@/lib/api";
import { absoluteTime, chapterSort, relativeTime } from "@/lib/format";
import {
  ArrowLeft,
  ExternalLink,
  Star,
  Bookmark,
  Share2,
  Check,
  Calendar,
  Clock,
  BookOpen,
  Search,
  ArrowUpDown,
  Sparkles,
} from "lucide-react";

function Stat({
  icon: Icon,
  label,
  value,
  subvalue,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  subvalue?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-surface/70 p-3.5 backdrop-blur-md transition-all duration-200 hover:border-white/15 hover:bg-surface-hover/70">
      <div className="flex items-center justify-between text-muted text-xs">
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
        <Icon className="h-4 w-4 opacity-70 group-hover:text-accent transition-colors" />
      </div>
      <p className="mt-1.5 text-sm font-bold text-foreground">{value}</p>
      {subvalue && <p className="mt-0.5 text-[10px] text-muted">{subvalue}</p>}
    </div>
  );
}

export default function SeriesDetail() {
  const params = useParams<{ source: string; slug: string }>();
  const source = params.source;
  const slug = decodeURIComponent(params.slug);

  const [series, setSeries] = useState<VortexSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [chapterQuery, setChapterQuery] = useState("");
  const [sortDesc, setSortDesc] = useState(true);

  // Sync bookmarks
  useEffect(() => {
    try {
      const saved = localStorage.getItem("comic_bookmarks");
      if (saved) {
        const list = JSON.parse(saved) as string[];
        setIsBookmarked(list.includes(slug));
      }
    } catch {
      // Ignore
    }
  }, [slug]);

  const toggleBookmark = () => {
    try {
      const saved = localStorage.getItem("comic_bookmarks");
      const list = saved ? (JSON.parse(saved) as string[]) : [];
      const next = list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
      localStorage.setItem("comic_bookmarks", JSON.stringify(next));
      setIsBookmarked(next.includes(slug));
    } catch {
      // Ignore
    }
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  const load = useCallback(async () => {
    try {
      setSeries(await api.getSeries(source, slug));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load series");
    } finally {
      setLoading(false);
    }
  }, [source, slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedChapters = useMemo(() => {
    if (!series?.chapters) return [];
    const chs = [...series.chapters].sort((a, b) =>
      chapterSort(a.number, b.number),
    );
    const ordered = sortDesc ? chs : [...chs].reverse();
    if (!chapterQuery.trim()) return ordered;
    const q = chapterQuery.toLowerCase().trim();
    return ordered.filter(
      (c) => c.number.toLowerCase().includes(q)
    );
  }, [series?.chapters, sortDesc, chapterQuery]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="h-80 skeleton-shimmer rounded-3xl border border-white/5 bg-surface/50" />
      </main>
    );
  }

  if (error || !series) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Library</span>
        </Link>
        <div className="mt-6 rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8 text-center backdrop-blur-md">
          <h1 className="text-lg font-bold text-accent">Series Not Found</h1>
          <p className="mt-1 text-sm text-muted">{error}</p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-xl bg-surface-2 px-4 py-2 text-xs font-semibold text-foreground hover:border-accent border border-white/10"
          >
            Return to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const isManhua = series.type?.toLowerCase().includes("manhua");
  const isManhwa = series.type?.toLowerCase().includes("manhwa");
  const badgeColor = isManhwa
    ? "from-pink-500 to-rose-500 text-white"
    : isManhua
      ? "from-cyan-500 to-blue-500 text-white"
      : "from-purple-500 to-indigo-500 text-white";

  const coverUrl = coverSrc(source, series.cover_url);

  return (
    <div className="relative min-h-screen">
      {/* -------------------------------------------------------------
          CINEMATIC BLURRED BACKGROUND BACKDROP
      ------------------------------------------------------------- */}
      {series.cover_url && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] overflow-hidden opacity-25">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt=""
            className="h-full w-full object-cover blur-3xl scale-125"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        </div>
      )}

      <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Breadcrumb Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-surface/80 px-3.5 py-1.5 text-xs font-semibold text-muted backdrop-blur-md transition-all hover:border-accent hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Library</span>
        </Link>

        {/* -------------------------------------------------------------
            HERO HEADER
        ------------------------------------------------------------- */}
        <header className="mt-6 flex flex-col gap-8 rounded-3xl border border-white/[0.08] bg-surface/75 p-6 backdrop-blur-xl shadow-2xl sm:flex-row sm:p-8">
          {/* Cover Poster */}
          {series.cover_url && (
            <div className="group relative mx-auto h-[320px] w-[220px] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-surface-2 shadow-2xl sm:mx-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                alt={`Cover of ${series.name}`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          )}

          {/* Details */}
          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <div>
              {/* Badges: Type, Status, Rating */}
              <div className="flex flex-wrap items-center gap-2">
                {series.type && (
                  <span
                    className={`rounded-lg bg-gradient-to-r ${badgeColor} px-2.5 py-1 text-xs font-bold tracking-wide text-white shadow-sm`}
                  >
                    {series.type}
                  </span>
                )}
                {series.status && (
                  <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-muted-light">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-ok" />
                    {series.status}
                  </span>
                )}
                {series.rating != null && (
                  <span className="flex items-center gap-1 rounded-lg border border-warn/20 bg-warn/10 px-2.5 py-1 text-xs font-bold text-warn">
                    <Star className="h-3.5 w-3.5 fill-warn" />
                    {series.rating.toFixed(1)}
                  </span>
                )}
                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-muted">
                  From {series.source}
                </span>
              </div>

              {/* Title */}
              <h1 className="mt-3 text-2xl font-black tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                {series.name}
              </h1>

              {/* Genres */}
              {series.genres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {series.genres.map((g) => (
                    <span
                      key={g}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-muted"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href={series.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-rose-500/25 transition-all hover:scale-[1.02] hover:shadow-rose-500/40 active:scale-[0.98]"
              >
                <span>Read on {series.source}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              {/* Bookmark Toggle */}
              <button
                onClick={toggleBookmark}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all ${
                  isBookmarked
                    ? "border-accent bg-accent/20 text-accent"
                    : "border-white/10 bg-surface-2 text-muted hover:border-white/20 hover:text-foreground"
                }`}
              >
                <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-accent" : ""}`} />
                <span>{isBookmarked ? "Bookmarked" : "Bookmark"}</span>
              </button>

              {/* Copy Share Link */}
              <button
                onClick={copyShareLink}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-surface-2 px-4 py-2.5 text-xs font-semibold text-muted hover:border-white/20 hover:text-foreground transition-all"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-ok" />
                    <span className="text-ok">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    <span>Share</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Stat Cards */}
            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Stat
                icon={BookOpen}
                label="Total Chapters"
                value={`${series.total_chapters} chs`}
                subvalue={series.latest_chapter ? `Latest: Ch. ${series.latest_chapter}` : undefined}
              />
              <Stat
                icon={Calendar}
                label="Debut Released"
                value={relativeTime(series.first_chapter_released_at)}
                subvalue={absoluteTime(series.first_chapter_released_at).split(" at ")[0]}
              />
              <Stat
                icon={Clock}
                label="Latest Release"
                value={relativeTime(series.last_updated_at)}
                subvalue={absoluteTime(series.last_updated_at).split(" at ")[0]}
              />
              <Stat
                icon={Sparkles}
                label="Cloud Backup"
                value="Backblaze B2"
                subvalue="Active CDN CDN"
              />
            </div>
          </div>
        </header>

        {/* -------------------------------------------------------------
            CHAPTER EXPLORER
        ------------------------------------------------------------- */}
        <section className="mt-10 rounded-3xl border border-white/[0.08] bg-surface/75 p-6 backdrop-blur-xl shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Chapter Index
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Showing {sortedChapters.length} of {series.chapters.length} chapters stored snapshot
              </p>
            </div>

            {/* Search & Sort Chapters */}
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  value={chapterQuery}
                  onChange={(e) => setChapterQuery(e.target.value)}
                  placeholder="Filter chapters…"
                  className="rounded-xl border border-white/10 bg-surface-2 py-1.5 pl-8 pr-3 text-xs text-foreground outline-none transition-all placeholder:text-muted focus:border-accent"
                />
              </div>

              <button
                onClick={() => setSortDesc((d) => !d)}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground transition-all"
                title="Toggle order"
              >
                <ArrowUpDown className="h-3 w-3" />
                <span>{sortDesc ? "Newest First" : "Oldest First"}</span>
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            {sortedChapters.map((c) => (
              <a
                key={c.number}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-surface-2/60 p-3 transition-all hover:border-accent/40 hover:bg-surface-2 hover:shadow-md"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-foreground group-hover:text-accent transition-colors">
                    Chapter {c.number}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[11px] text-muted group-hover:text-muted-light"
                    title={absoluteTime(c.released_at)}
                  >
                    {relativeTime(c.released_at)}
                  </span>
                  <ExternalLink className="h-3 w-3 text-muted opacity-0 group-hover:opacity-100 group-hover:text-accent transition-opacity" />
                </div>
              </a>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
