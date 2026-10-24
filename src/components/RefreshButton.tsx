"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError, type MultiScrapeResult } from "@/lib/api";

interface Props {
  /** Called after a run so the caller can reload its data. */
  onDone: () => void | Promise<void>;
}

const plural = (n: number) => (n === 1 ? "comic" : "comics");

/**
 * Scrapes every source at once on demand. The scheduler runs daily on its
 * own; this is the "check right now" escape hatch.
 */
export default function RefreshButton({ onDone }: Props) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<MultiScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // A full run crawls catalogue pages and sitemaps and takes about a minute.
  // Without a ticking counter that wait reads as a hung button.
  useEffect(() => {
    if (running) {
      timer.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running]);

  async function run() {
    setRunning(true);
    setElapsed(0);
    setError(null);
    setResult(null);
    try {
      const res = await api.scrapeAll();
      setResult(res);
      await onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setRunning(false);
    }
  }

  const allOk = result?.sources.every((s) => s.ok) ?? false;

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={run}
        disabled={running}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          className={`h-4 w-4 ${running ? "animate-spin" : ""}`}
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
        {running ? `Checking all sites… ${elapsed}s` : "Refresh now"}
      </button>

      {running && (
        <p className="max-w-[16rem] text-right text-xs text-muted">
          Scanning every site at the same time. A full run takes about a
          minute — leave this open.
        </p>
      )}

      {result && !running && (
        <div
          role="status"
          className="w-full max-w-[18rem] rounded-lg border border-border bg-surface px-3 py-2 text-xs"
        >
          <p className="font-semibold">
            {result.total_saved > 0 ? (
              <span className="text-ok">
                {result.total_saved} new {plural(result.total_saved)} added
              </span>
            ) : allOk ? (
              <span>
                0 comics updated on{" "}
                {result.sources.length === 2 ? "both sites" : "any site"}
              </span>
            ) : (
              <span>No new comics added</span>
            )}
          </p>
          <ul className="mt-1.5 space-y-1">
            {result.sources.map((s) => (
              <li key={s.source} className="flex justify-between gap-3">
                <span className="text-muted">{s.name}</span>
                {s.ok && s.result ? (
                  <span
                    className={`tabular-nums font-medium ${
                      s.result.saved > 0 ? "text-ok" : ""
                    }`}
                    title={`${s.result.matched_month} debuted in ${s.result.month}, ${s.result.already_stored} already stored · ${s.result.duration_seconds}s`}
                  >
                    {s.result.saved} new
                  </span>
                ) : (
                  <span className="font-medium text-accent" title={s.error ?? ""}>
                    Failed
                  </span>
                )}
              </li>
            ))}
          </ul>
          {result.sources
            .filter((s) => !s.ok)
            .map((s) => (
              <p key={s.source} className="mt-1.5 break-words text-accent">
                {s.name}: {s.error}
              </p>
            ))}
          <p className="mt-1.5 text-right text-muted">
            {result.duration_seconds}s
          </p>
        </div>
      )}

      {error && !running && (
        <p className="max-w-xs text-right text-xs text-accent">{error}</p>
      )}
    </div>
  );
}
