"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError, type MultiScrapeResult } from "@/lib/api";
import { RefreshCw, CheckCircle2, AlertCircle, Sparkles, X } from "lucide-react";

interface Props {
  onDone: () => void | Promise<void>;
}

const plural = (n: number) => (n === 1 ? "comic" : "comics");

export default function RefreshButton({ onDone }: Props) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<MultiScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

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
    setDismissed(false);
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
    <div className="relative flex flex-col items-end gap-2.5">
      <button
        onClick={run}
        disabled={running}
        className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-lg shadow-rose-500/25 transition-all duration-300 hover:shadow-rose-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
      >
        <span className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
        <RefreshCw
          className={`h-3.5 w-3.5 transition-transform ${
            running ? "animate-spin" : "group-hover:rotate-180 duration-500"
          }`}
        />
        <span>{running ? `Checking sites (${elapsed}s)…` : "Scan for Updates"}</span>
      </button>

      {running && (
        <div className="flex items-center gap-2 text-right text-xs text-muted">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          <span>Scanning catalogues & sitemaps (takes ~30-60s)</span>
        </div>
      )}

      {result && !running && !dismissed && (
        <div
          role="status"
          className="glass-dropdown animate-in fade-in slide-in-from-top-2 absolute right-0 top-12 z-50 w-80 rounded-2xl p-4 text-xs"
        >
          <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              {allOk ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-ok/20 text-ok">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-warn/20 text-warn">
                  <AlertCircle className="h-3.5 w-3.5" />
                </div>
              )}
              <span className="font-semibold text-foreground">
                {result.total_saved > 0 ? (
                  <span className="text-ok">
                    +{result.total_saved} new {plural(result.total_saved)} found
                  </span>
                ) : (
                  <span>All catalogs up to date</span>
                )}
              </span>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="text-muted hover:text-foreground transition-colors p-0.5"
              aria-label="Dismiss scan results"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {result.sources.map((s) => (
              <div
                key={s.source}
                className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-1.5"
              >
                <span className="font-medium text-muted-light">{s.name}</span>
                {s.ok && s.result ? (
                  <span
                    className={`font-semibold tabular-nums ${
                      s.result.saved > 0 ? "text-ok" : "text-muted"
                    }`}
                  >
                    {s.result.saved > 0 ? `+${s.result.saved} new` : "0 new"}
                  </span>
                ) : (
                  <span className="font-semibold text-accent">Error</span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-[11px] text-muted">
            <span>Duration: {result.duration_seconds}s</span>
            <span className="text-ok flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Auto-synced
            </span>
          </div>
        </div>
      )}

      {error && !running && (
        <div className="flex items-center gap-2 text-right text-xs text-accent">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
