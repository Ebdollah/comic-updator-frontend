"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type VortexSeries } from "@/lib/api";
import { absoluteTime, chapterSort, relativeTime } from "@/lib/format";

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
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

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="h-64 animate-pulse rounded-xl border border-border bg-surface" />
      </main>
    );
  }

  if (error || !series) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-10">
        <Link href="/" className="text-sm text-muted hover:text-accent">
          ← Back
        </Link>
        <div className="mt-4 rounded-xl border border-border bg-accent-soft p-6">
          <h1 className="font-semibold text-accent">Series not found</h1>
          <p className="mt-1 text-sm text-muted">{error}</p>
        </div>
      </main>
    );
  }

  const chapters = [...series.chapters].sort((a, b) =>
    chapterSort(a.number, b.number),
  );

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Link href="/" className="text-sm text-muted hover:text-accent">
        ← All series
      </Link>

      <header className="mt-4 flex flex-col gap-6 sm:flex-row">
        {series.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={series.cover_url}
            alt={`Cover of ${series.name}`}
            /* See SeriesCard: the CDN rejects requests with a foreign Referer. */
            referrerPolicy="no-referrer"
            className="h-[280px] w-[190px] shrink-0 rounded-xl border border-border object-cover"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {series.type && (
              <span className="rounded bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">
                {series.type}
              </span>
            )}
            {series.status && (
              <span className="rounded border border-border px-2 py-0.5 text-[11px] font-medium text-muted">
                {series.status}
              </span>
            )}
            {series.rating != null && (
              <span className="text-sm font-semibold text-warn">
                ★ {series.rating.toFixed(1)}
              </span>
            )}
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-balance">
            {series.name}
          </h1>

          {series.genres.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {series.genres.map((g) => (
                <span
                  key={g}
                  className="rounded border border-border px-2 py-0.5 text-[11px] text-muted"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          <a
            href={series.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-block text-sm text-accent hover:underline"
          >
            Open on {series.source} ↗
          </a>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Chapters" value={series.total_chapters} />
            <Stat
              label="Latest"
              value={series.latest_chapter ? `Ch. ${series.latest_chapter}` : "—"}
            />
            <Stat
              label="Last update"
              value={relativeTime(series.last_updated_at)}
            />
            <Stat
              label="Chapter 1 released"
              value={absoluteTime(series.first_chapter_released_at)}
            />
            <Stat
              label="Stored"
              value={
                <span title={absoluteTime(series.scraped_at)}>
                  {relativeTime(series.scraped_at)}
                </span>
              }
            />
          </div>
        </div>
      </header>

      <section className="mt-10">
        <h2 className="mb-1 text-lg font-semibold">
          Chapters{" "}
          <span className="text-sm font-normal text-muted">
            ({chapters.length})
          </span>
        </h2>
        <p className="mb-3 text-xs text-muted">
          As captured {relativeTime(series.scraped_at)}. Records are kept frozen,
          so newer chapters won&apos;t appear here — open the series on the site
          for the live list.
        </p>

        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {chapters.map((c) => (
            <li key={c.number}>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-surface-2"
              >
                <span className="font-medium">Chapter {c.number}</span>
                <span
                  className="shrink-0 text-xs text-muted"
                  title={absoluteTime(c.released_at)}
                >
                  {relativeTime(c.released_at)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
