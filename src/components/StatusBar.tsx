"use client";

import { relativeTime } from "@/lib/format";
import type { StatusResponse } from "@/lib/api";

function Dot({ tone }: { tone: "ok" | "warn" | "bad" }) {
  const color =
    tone === "ok"
      ? "bg-ok"
      : tone === "warn"
        ? "bg-warn"
        : "bg-accent";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

function Cell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      <span className="flex items-center gap-2 text-sm font-medium">
        {children}
      </span>
    </div>
  );
}

/** Shows whether the pipeline is healthy: database, scheduler, last run. */
export default function StatusBar({ status }: { status: StatusResponse | null }) {
  if (!status) {
    return (
      <div className="h-[74px] animate-pulse rounded-xl border border-border bg-surface" />
    );
  }

  const job = status.scheduler.jobs[0];
  const schedulerOn = status.scheduler.enabled && status.scheduler.running;

  return (
    <div className="grid grid-cols-2 gap-5 rounded-xl border border-border bg-surface px-5 py-4 sm:grid-cols-4">
      <Cell label="Database">
        <Dot tone={status.database_connected ? "ok" : "bad"} />
        {status.database_connected ? "Connected" : "Unreachable"}
      </Cell>

      <Cell label="Series stored">
        <span className="tabular-nums">{status.stored_series}</span>
      </Cell>

      <Cell label="Scheduler">
        <Dot tone={schedulerOn ? "ok" : "warn"} />
        {schedulerOn ? (status.scheduler.schedule ?? "On") : "Off"}
      </Cell>

      <Cell label={job ? "Next check" : "Last check"}>
        <span className="text-muted">
          {job?.next_run_at
            ? relativeTime(job.next_run_at)
            : relativeTime(status.last_run_at)}
        </span>
      </Cell>
    </div>
  );
}
