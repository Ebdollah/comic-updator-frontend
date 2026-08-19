"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError, type ScrapeResult } from "@/lib/api";

interface Props {
  /** Which source to scrape, e.g. "vortexscans". */
  source: string;
  /** Called after a successful run so the caller can reload its data. */
  onDone: () => void | Promise<void>;
}

/**
 * Triggers a scrape on demand. The scheduler runs hourly on its own; this is
 * the "check right now" escape hatch.
 */
export default function RefreshButton({ source, onDone }: Props) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // A full run crawls 12 catalogue pages plus 24 sitemaps and takes about a
  // minute. Without a ticking counter that wait reads as a hung button.
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
      const res = await api.scrape(source);
      setResult(res);
      await onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setRunning(false);
    }
  }

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
        {running ? `Checking site… ${elapsed}s` : "Refresh now"}
      </button>

      {running && (
        <p className="max-w-[15rem] text-right text-xs text-muted">
          Crawling the catalogue and sitemaps. A full run takes about a minute —
          leave this open.
        </p>
      )}

      {result && !running && (
        <p className="text-right text-xs text-muted">
          {result.saved > 0 ? (
            <span className="font-semibold text-ok">
              {result.saved} new {result.saved === 1 ? "series" : "series"} added
            </span>
          ) : (
            <span>No new series for {result.month}</span>
          )}
          <span className="ml-1">
            · {result.matched_month} matched, {result.already_stored} already
            stored · {result.duration_seconds}s
          </span>
        </p>
      )}

      {error && !running && (
        <p className="max-w-xs text-right text-xs text-accent">{error}</p>
      )}
    </div>
  );
}
