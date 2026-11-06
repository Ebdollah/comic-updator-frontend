"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { monthLabel } from "@/lib/format";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Sparkles,
  Layers,
} from "lucide-react";

interface MonthData {
  month: string; // "YYYY-MM"
  count: number;
}

interface DebutMonthPickerProps {
  months: MonthData[];
  selectedMonth: string; // "all" | "current" | "previous" | "YYYY" | "YYYY-MM"
  onSelect: (monthKey: string) => void;
  thisMonthKey: string;
  lastMonthKey: string;
  allCount: number;
}

const MONTH_NAMES = [
  { num: "01", short: "Jan", full: "January" },
  { num: "02", short: "Feb", full: "February" },
  { num: "03", short: "Mar", full: "March" },
  { num: "04", short: "Apr", full: "April" },
  { num: "05", short: "May", full: "May" },
  { num: "06", short: "Jun", full: "June" },
  { num: "07", short: "Jul", full: "July" },
  { num: "08", short: "Aug", full: "August" },
  { num: "09", short: "Sep", full: "September" },
  { num: "10", short: "Oct", full: "October" },
  { num: "11", short: "Nov", full: "November" },
  { num: "12", short: "Dec", full: "December" },
];

export default function DebutMonthPicker({
  months,
  selectedMonth,
  onSelect,
  thisMonthKey,
  lastMonthKey,
  allCount,
}: DebutMonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Group counts by "YYYY-MM" and calculate yearly totals
  const { monthCountMap, yearData } = useMemo(() => {
    const map = new Map<string, number>();
    const yearTotals = new Map<string, number>();

    for (const m of months) {
      map.set(m.month, m.count);
      const y = m.month.slice(0, 4);
      yearTotals.set(y, (yearTotals.get(y) || 0) + m.count);
    }

    const currentYear = new Date().getFullYear().toString();
    if (!yearTotals.has(currentYear)) {
      yearTotals.set(currentYear, 0);
    }

    const sortedYears = Array.from(yearTotals.keys()).sort((a, b) =>
      b.localeCompare(a),
    );

    return {
      monthCountMap: map,
      yearData: sortedYears.map((year) => ({
        year,
        total: yearTotals.get(year) || 0,
      })),
    };
  }, [months]);

  // Determine which year to view in the picker
  const initialYear = useMemo(() => {
    if (selectedMonth && /^\d{4}/.test(selectedMonth)) {
      return selectedMonth.slice(0, 4);
    }
    return yearData[0]?.year || new Date().getFullYear().toString();
  }, [selectedMonth, yearData]);

  const [activeYear, setActiveYear] = useState<string>(initialYear);

  // Update active year when selection changes
  useEffect(() => {
    if (selectedMonth && /^\d{4}/.test(selectedMonth)) {
      setActiveYear(selectedMonth.slice(0, 4));
    }
  }, [selectedMonth]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  // Cycle through years with previous/next buttons
  const currentYearIndex = yearData.findIndex((y) => y.year === activeYear);
  const hasPrevYear = currentYearIndex < yearData.length - 1;
  const hasNextYear = currentYearIndex > 0;

  const handlePrevYear = () => {
    if (hasPrevYear) setActiveYear(yearData[currentYearIndex + 1].year);
  };
  const handleNextYear = () => {
    if (hasNextYear) setActiveYear(yearData[currentYearIndex - 1].year);
  };

  const activeYearData = yearData.find((y) => y.year === activeYear);
  const activeYearTotal = activeYearData?.total || 0;

  // Active label for the trigger button
  const triggerLabel = useMemo(() => {
    if (selectedMonth === "all") return "Browse by Year & Month";
    if (selectedMonth === "current") return `This Month (${monthLabel(thisMonthKey)})`;
    if (selectedMonth === "previous") return `Last Month (${monthLabel(lastMonthKey)})`;
    if (/^\d{4}$/.test(selectedMonth)) return `All of ${selectedMonth} (${activeYearTotal})`;
    if (/^\d{4}-\d{2}$/.test(selectedMonth)) {
      const count = monthCountMap.get(selectedMonth) ?? 0;
      return `${monthLabel(selectedMonth)} (${count})`;
    }
    return "Browse by Year & Month";
  }, [selectedMonth, thisMonthKey, lastMonthKey, activeYearTotal, monthCountMap]);

  const isCustomActive =
    /^\d{4}/.test(selectedMonth) &&
    selectedMonth !== thisMonthKey &&
    selectedMonth !== lastMonthKey;

  return (
    <div className="relative" ref={containerRef}>
      {/* -------------------------------------------------------------
          TRIGGER BUTTON
      ------------------------------------------------------------- */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
          isCustomActive
            ? "border-accent bg-accent/20 text-accent shadow-md shadow-accent/20"
            : isOpen
              ? "border-white/20 bg-surface-2 text-foreground"
              : "border-white/[0.08] bg-surface-2/70 text-muted hover:border-white/20 hover:text-foreground"
        }`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Calendar className="h-3.5 w-3.5 opacity-80" />
        <span>{triggerLabel}</span>
        {isCustomActive ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onSelect("all");
            }}
            className="ml-1 rounded-full p-0.5 hover:bg-accent hover:text-white transition-colors"
            title="Clear filter"
          >
            <X className="h-3 w-3" />
          </span>
        ) : (
          <ChevronDown
            className={`h-3.5 w-3.5 opacity-60 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {/* -------------------------------------------------------------
          YEAR & MONTH PICKER POPOVER MODAL
      ------------------------------------------------------------- */}
      {isOpen && (
        <>
          {/* Backdrop to capture outside clicks and block interactions below */}
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label="Filter series by debut date"
            className="animate-in fade-in zoom-in-95 absolute left-0 top-12 z-50 w-[330px] sm:w-[370px] max-w-[calc(100vw-2rem)] rounded-3xl border border-white/15 bg-[#12161f] p-5 shadow-2xl shadow-black/90 backdrop-blur-2xl"
          >
          {/* Header with Title & Close button */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accent" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Debut Archive
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-muted hover:bg-white/5 hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Year Navigator (Segmented Tabs / Carousel) */}
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-surface/80 border border-white/[0.06] p-1.5">
            <button
              onClick={handlePrevYear}
              disabled={!hasPrevYear}
              title="Previous Year"
              className="flex h-7 w-7 items-center justify-center rounded-xl text-muted hover:bg-white/5 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Quick Year Pills */}
            <div className="flex items-center gap-1">
              {yearData.map((y) => (
                <button
                  key={y.year}
                  onClick={() => setActiveYear(y.year)}
                  className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${
                    activeYear === y.year
                      ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-sm shadow-rose-500/30"
                      : "text-muted hover:text-foreground hover:bg-white/[0.04]"
                  }`}
                >
                  {y.year}
                  <span className="ml-1 text-[10px] opacity-75">
                    ({y.total})
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={handleNextYear}
              disabled={!hasNextYear}
              title="Next Year"
              className="flex h-7 w-7 items-center justify-center rounded-xl text-muted hover:bg-white/5 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Full Year Selector Button */}
          <div className="mt-2.5">
            <button
              onClick={() => {
                onSelect(activeYear);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedMonth === activeYear
                  ? "bg-accent/20 border border-accent text-accent"
                  : "bg-white/[0.02] border border-white/[0.05] text-muted-light hover:border-white/15 hover:bg-white/[0.05]"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                <span>All series debuted in {activeYear}</span>
              </span>
              <span className="rounded-md bg-white/10 px-1.5 py-0.2 text-[10px] font-bold text-foreground">
                {activeYearTotal}
              </span>
            </button>
          </div>

          {/* 12-Month Calendar Grid (4 columns x 3 rows) */}
          <div className="mt-3.5 grid grid-cols-4 gap-2">
            {MONTH_NAMES.map((m) => {
              const monthKey = `${activeYear}-${m.num}`;
              const count = monthCountMap.get(monthKey) || 0;
              const hasSeries = count > 0;
              const isSelected = selectedMonth === monthKey;

              return (
                <button
                  key={m.num}
                  disabled={!hasSeries}
                  onClick={() => {
                    onSelect(monthKey);
                    setIsOpen(false);
                  }}
                  title={
                    hasSeries
                      ? `${m.full} ${activeYear}: ${count} series`
                      : `No series debuted in ${m.full} ${activeYear}`
                  }
                  className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-center transition-all ${
                    isSelected
                      ? "bg-gradient-to-tr from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/30 scale-105"
                      : hasSeries
                        ? "border border-white/[0.08] bg-surface-2/70 text-foreground hover:border-accent hover:scale-[1.02] hover:bg-surface-hover"
                        : "border border-transparent bg-white/[0.02] text-muted/30 cursor-not-allowed"
                  }`}
                >
                  <span
                    className={`text-xs font-bold tracking-tight ${
                      isSelected
                        ? "text-white"
                        : hasSeries
                          ? "text-foreground"
                          : "text-muted/40"
                    }`}
                  >
                    {m.short}
                  </span>
                  <span
                    className={`mt-0.5 text-[10px] font-semibold tabular-nums ${
                      isSelected
                        ? "text-white/90"
                        : hasSeries
                          ? "text-accent"
                          : "text-muted/20"
                    }`}
                  >
                    {hasSeries ? count : "—"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Footer Shortcuts */}
          <div className="mt-4 flex items-center justify-between border-t border-white/[0.08] pt-3 text-[11px]">
            <button
              onClick={() => {
                onSelect("all");
                setIsOpen(false);
              }}
              className="text-muted hover:text-accent font-semibold transition-colors flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3" />
              <span>All Months ({allCount})</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onSelect("current");
                  setIsOpen(false);
                }}
                className={`font-semibold hover:text-accent transition-colors ${
                  selectedMonth === "current" ? "text-accent" : "text-muted"
                }`}
              >
                This Month
              </button>
              <span className="text-muted/40">·</span>
              <button
                onClick={() => {
                  onSelect("previous");
                  setIsOpen(false);
                }}
                className={`font-semibold hover:text-accent transition-colors ${
                  selectedMonth === "previous" ? "text-accent" : "text-muted"
                }`}
              >
                Last Month
              </button>
            </div>
          </div>
        </div>
      </>
    )}
    </div>
  );
}
