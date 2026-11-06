"use client";

import Link from "next/link";
import { absoluteTime, relativeTime } from "@/lib/format";
import { coverSrc } from "@/lib/api";
import type { SeriesSummary } from "@/lib/api";
import { Star, Clock, Calendar, ExternalLink, Bookmark, BookOpen } from "lucide-react";
import React from "react";

interface SeriesCardProps {
  series: SeriesSummary;
  source: string;
  viewMode?: "grid" | "list";
  isBookmarked?: boolean;
  onToggleBookmark?: (slug: string) => void;
}

export default function SeriesCard({
  series,
  source,
  viewMode = "list",
  isBookmarked = false,
  onToggleBookmark,
}: SeriesCardProps) {
  const isManhua = series.type?.toLowerCase().includes("manhua");
  const isManhwa = series.type?.toLowerCase().includes("manhwa");

  const badgeColor = isManhwa
    ? "from-pink-500 to-rose-500 text-white"
    : isManhua
      ? "from-cyan-500 to-blue-500 text-white"
      : "from-purple-500 to-indigo-500 text-white";

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleBookmark?.(series.slug);
  };

  // -------------------------------------------------------------
  // GRID / POSTER VIEW MODE
  // -------------------------------------------------------------
  if (viewMode === "grid") {
    return (
      <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-surface/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10">
        <Link
          href={`/series/${source}/${encodeURIComponent(series.slug)}`}
          className="relative aspect-[3/4.2] w-full overflow-hidden bg-surface-2"
        >
          {series.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverSrc(source, series.cover_url)}
              alt={`Cover of ${series.name}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted">
              No Cover
            </div>
          )}

          {/* Top badges */}
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 z-10">
            {series.type && (
              <span
                className={`rounded-lg bg-gradient-to-r ${badgeColor} px-2 py-0.5 text-[10px] font-bold tracking-wide shadow-md`}
              >
                {series.type}
              </span>
            )}
          </div>

          {/* Bookmark Button */}
          <button
            onClick={handleBookmark}
            title={isBookmarked ? "Remove from bookmarks" : "Bookmark series"}
            className={`absolute right-2.5 top-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-lg backdrop-blur-md transition-all ${
              isBookmarked
                ? "bg-accent text-white shadow-md shadow-accent/40"
                : "bg-black/50 text-white/70 hover:bg-black/80 hover:text-white"
            }`}
          >
            <Bookmark
              className={`h-3.5 w-3.5 ${isBookmarked ? "fill-white" : ""}`}
            />
          </button>

          {/* Bottom gradient shadow & chapter pill */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/70 to-transparent p-3 pt-10">
            <div className="flex items-center justify-between gap-1 text-[11px]">
              {series.latest_chapter ? (
                <span className="rounded-md bg-white/10 px-2 py-0.5 font-semibold text-foreground backdrop-blur-md">
                  Ch. {series.latest_chapter}
                </span>
              ) : (
                <span className="text-muted">Ch. 1</span>
              )}
              {series.rating != null && (
                <span className="flex items-center gap-1 font-semibold text-warn">
                  <Star className="h-3 w-3 fill-warn" />
                  {series.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </Link>

        {/* Content details below image */}
        <div className="flex flex-1 flex-col p-3 pt-2">
          <Link
            href={`/series/${source}/${encodeURIComponent(series.slug)}`}
            className="line-clamp-2 text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-accent"
          >
            {series.name}
          </Link>

          <div className="mt-auto pt-2.5 flex items-center justify-between border-t border-white/[0.05] text-[11px] text-muted">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 opacity-60" />
              {relativeTime(series.first_chapter_released_at)}
            </span>
            <span className="tabular-nums font-medium text-foreground/80">
              {series.total_chapters} chs
            </span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // LIST VIEW MODE (Default horizontal sleek card)
  // -------------------------------------------------------------
  return (
    <div className="group relative flex overflow-hidden rounded-2xl border border-white/[0.07] bg-surface/75 p-3.5 backdrop-blur-sm transition-all duration-200 hover:border-accent/40 hover:bg-surface-hover/80 hover:shadow-lg hover:shadow-accent/5">
      {/* Thumbnail */}
      <Link
        href={`/series/${source}/${encodeURIComponent(series.slug)}`}
        className="relative h-[138px] w-[98px] shrink-0 overflow-hidden rounded-xl bg-surface-2 shadow-inner"
      >
        {series.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverSrc(source, series.cover_url)}
            alt={`Cover of ${series.name}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted">
            No cover
          </div>
        )}
        {series.type && (
          <span
            className={`absolute left-1.5 top-1.5 rounded-md bg-gradient-to-r ${badgeColor} px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white shadow-sm`}
          >
            {series.type}
          </span>
        )}
      </Link>

      {/* Main Info */}
      <div className="ml-4 flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/series/${source}/${encodeURIComponent(series.slug)}`}
              className="line-clamp-2 text-sm font-bold tracking-tight text-foreground transition-colors group-hover:text-accent"
            >
              {series.name}
            </Link>

            {/* Quick Actions (Bookmark + External) */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleBookmark}
                title={isBookmarked ? "Remove bookmark" : "Bookmark series"}
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                  isBookmarked
                    ? "bg-accent/20 text-accent"
                    : "text-muted hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <Bookmark
                  className={`h-3.5 w-3.5 ${isBookmarked ? "fill-accent" : ""}`}
                />
              </button>
            </div>
          </div>

          {/* Rating, Status & Chapters line */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {series.rating != null && (
              <span className="flex items-center gap-1 font-semibold text-warn">
                <Star className="h-3 w-3 fill-warn" />
                {series.rating.toFixed(1)}
              </span>
            )}
            {series.status && (
              <span className="flex items-center gap-1.5 text-muted">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-ok" />
                {series.status}
              </span>
            )}
            <span className="text-muted tabular-nums">
              {series.total_chapters}{" "}
              {series.total_chapters === 1 ? "chapter" : "chapters"}
            </span>
          </div>

          {/* Genre chips */}
          {series.genres.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {series.genres.slice(0, 3).map((g) => (
                <span
                  key={g}
                  className="rounded-md border border-white/[0.08] bg-white/[0.02] px-1.5 py-0.5 text-[10px] font-medium text-muted"
                >
                  {g}
                </span>
              ))}
              {series.genres.length > 3 && (
                <span className="text-[10px] text-muted self-center">
                  +{series.genres.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer info: Chapter 1 debut, latest update, stored status */}
        <div className="mt-2 border-t border-white/[0.05] pt-2">
          <div className="grid grid-cols-2 gap-2 text-[11px] text-muted">
            <div className="flex items-center gap-1 truncate">
              <Calendar className="h-3 w-3 shrink-0 opacity-60" />
              <span className="truncate" title={absoluteTime(series.first_chapter_released_at)}>
                Debut: <strong className="font-medium text-foreground">{relativeTime(series.first_chapter_released_at)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1 truncate">
              <Clock className="h-3 w-3 shrink-0 opacity-60" />
              <span className="truncate" title={absoluteTime(series.last_updated_at)}>
                Updated: <strong className="font-medium text-foreground">{relativeTime(series.last_updated_at)}</strong>
              </span>
            </div>
          </div>

          <div className="mt-1 flex items-center justify-between text-[10px] text-muted">
            {series.latest_chapter ? (
              <span className="truncate font-medium text-muted-light">
                Latest: <span className="text-foreground">Ch. {series.latest_chapter}</span>
              </span>
            ) : (
              <span />
            )}
            <span
              className="shrink-0 italic opacity-75"
              title={`Captured ${absoluteTime(series.scraped_at)}`}
            >
              saved {relativeTime(series.scraped_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
