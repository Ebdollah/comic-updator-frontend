"use client";

import { relativeTime } from "@/lib/format";
import type { StatusResponse } from "@/lib/api";
import { Database, Cloud, BookOpen, Clock, Activity, CheckCircle2, AlertTriangle } from "lucide-react";

export default function StatusBar({ status }: { status: StatusResponse | null }) {
  if (!status) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[84px] skeleton-shimmer rounded-2xl border border-white/5 bg-surface/50"
          />
        ))}
      </div>
    );
  }

  const job = status.scheduler.jobs[0];
  const schedulerOn = status.scheduler.enabled && status.scheduler.running;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* 1. Database */}
      <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-surface/70 p-4 backdrop-blur-md transition-all duration-200 hover:border-white/10 hover:bg-surface-hover/70">
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="font-medium tracking-wide">Database</span>
          <Database className="h-4 w-4 opacity-70 group-hover:text-accent transition-colors" />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {status.database_connected && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                status.database_connected ? "bg-ok" : "bg-accent"
              }`}
            />
          </span>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            {status.database_connected ? "Firestore Connected" : "Unreachable"}
          </span>
        </div>
      </div>

      {/* 2. Cloud Storage (Backblaze B2) */}
      <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-surface/70 p-4 backdrop-blur-md transition-all duration-200 hover:border-white/10 hover:bg-surface-hover/70">
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="font-medium tracking-wide">Image Storage</span>
          <Cloud className="h-4 w-4 opacity-70 group-hover:text-info transition-colors" />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-info opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-info" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Backblaze B2 CDN
          </span>
        </div>
      </div>

      {/* 3. Series Stored */}
      <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-surface/70 p-4 backdrop-blur-md transition-all duration-200 hover:border-white/10 hover:bg-surface-hover/70">
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="font-medium tracking-wide">Comics Stored</span>
          <BookOpen className="h-4 w-4 opacity-70 group-hover:text-ok transition-colors" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold tracking-tight text-foreground tabular-nums">
            {status.stored_series.toLocaleString()}
          </span>
          <span className="text-[11px] font-medium text-muted">series indexed</span>
        </div>
      </div>

      {/* 4. Scheduler */}
      <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-surface/70 p-4 backdrop-blur-md transition-all duration-200 hover:border-white/10 hover:bg-surface-hover/70">
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="font-medium tracking-wide">
            {job ? "Next Auto-Check" : "Scheduler"}
          </span>
          <Clock className="h-4 w-4 opacity-70 group-hover:text-warn transition-colors" />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              schedulerOn ? "bg-ok" : "bg-warn"
            }`}
          />
          <span className="text-sm font-semibold tracking-tight text-foreground">
            {job?.next_run_at ? relativeTime(job.next_run_at) : (status.scheduler.schedule ?? "Active")}
          </span>
        </div>
      </div>
    </div>
  );
}
