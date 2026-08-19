import Link from "next/link";
import { absoluteTime, relativeTime } from "@/lib/format";
import type { VortexSeries } from "@/lib/api";

/* Covers are hotlinked from the source CDN rather than run through
   next/image, so no remote-host config is needed and a CDN change can't
   break the build. */

export default function SeriesCard({
  series,
  source,
}: {
  series: VortexSeries;
  source: string;
}) {
  return (
    <Link
      href={`/series/${source}/${encodeURIComponent(series.slug)}`}
      className="group flex gap-4 rounded-xl border border-border bg-surface p-3 transition hover:border-accent"
    >
      <div className="relative h-[132px] w-[92px] shrink-0 overflow-hidden rounded-lg bg-surface-2">
        {series.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={series.cover_url}
            alt={`Cover of ${series.name}`}
            loading="lazy"
            /* Their CDN 403s any request carrying a foreign Referer. Sending
               none at all is accepted, and is what lets covers render here. */
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            No cover
          </div>
        )}
        {series.type && (
          <span className="absolute right-1 top-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {series.type}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-accent">
          {series.name}
        </h3>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {series.rating != null && (
            <span className="flex items-center gap-1 font-medium text-warn">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {series.rating.toFixed(1)}
            </span>
          )}
          {series.status && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-ok" />
              {series.status}
            </span>
          )}
          <span className="tabular-nums">
            {series.total_chapters}{" "}
            {series.total_chapters === 1 ? "chapter" : "chapters"}
          </span>
        </div>

        {series.genres.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {series.genres.slice(0, 4).map((g) => (
              <span
                key={g}
                className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1 pt-3 text-xs">
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-muted">
              Chapter 1
            </dt>
            <dd
              className="font-medium"
              title={absoluteTime(series.first_chapter_released_at)}
            >
              {relativeTime(series.first_chapter_released_at)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-muted">
              Last update
            </dt>
            <dd
              className="font-medium"
              title={absoluteTime(series.last_updated_at)}
            >
              {relativeTime(series.last_updated_at)}
            </dd>
          </div>
        </dl>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted">
          {series.latest_chapter && (
            <span className="truncate">
              Latest:{" "}
              <span className="font-semibold text-foreground">
                Chapter {series.latest_chapter}
              </span>
            </span>
          )}
          {/* Records are a snapshot: never rewritten after capture, so say
              plainly how old the numbers above are. */}
          <span
            className="shrink-0 italic"
            title={`Captured ${absoluteTime(series.scraped_at)} — not updated since`}
          >
            stored {relativeTime(series.scraped_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}
