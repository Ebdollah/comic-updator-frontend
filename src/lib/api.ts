/**
 * Client for the Comic Updator backend.
 *
 * Types mirror app/models/vortexscans.py on the FastAPI side. If you change a
 * field there, change it here too — nothing checks that for you across the
 * language boundary.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export interface ChapterInfo {
  number: string;
  url: string;
  released_at: string | null;
}

export interface VortexSeries {
  slug: string;
  name: string;
  url: string;
  cover_url: string | null;
  rating: number | null;
  type: string | null;
  status: string | null;
  /** Genre tags, when the source lists them. Vortex has none; Thunder does. */
  genres: string[];
  total_chapters: number;
  first_chapter_released_at: string | null;
  last_updated_at: string | null;
  latest_chapter: string | null;
  latest_chapter_url: string | null;
  chapters: ChapterInfo[];
  source: string;
  scraped_at: string | null;
}

export interface ScrapeResult {
  month: string;
  candidates_seen: number;
  matched_month: number;
  already_stored: number;
  saved: number;
  saved_slugs: string[];
  skipped_slugs: string[];
  dry_run: boolean;
  duration_seconds: number;
}

export interface SchedulerJob {
  id: string;
  name: string;
  next_run_at: string | null;
}

export interface SourceInfo {
  id: string;
  name: string;
  site: string;
  collection: string;
  notes: string;
}

export interface StatusResponse {
  source?: string;
  name?: string;
  site?: string;
  notes?: string;
  database_connected: boolean;
  stored_series: number;
  scheduler: {
    enabled: boolean;
    running: boolean;
    schedule?: string;
    now?: string;
    jobs: SchedulerJob[];
  };
  last_run_at: string | null;
  last_result: ScrapeResult | null;
}

/** Thrown for any non-2xx response, carrying the backend's detail message. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new ApiError(
      `Can't reach the API at ${API_BASE}. Is the backend running?`,
      0,
    );
  }

  if (!response.ok) {
    let detail = `Request failed with ${response.status}`;
    try {
      const body = await response.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      // Response wasn't JSON; keep the generic message.
    }
    throw new ApiError(detail, response.status);
  }

  return (await response.json()) as T;
}

export const api = {
  /** The sources this backend can scrape. Drives the dashboard tabs. */
  listSources: () => request<SourceInfo[]>("/sources"),

  listSeries: (source: string, limit = 200) =>
    request<VortexSeries[]>(`/sources/${source}/series?limit=${limit}`),

  getSeries: (source: string, slug: string) =>
    request<VortexSeries>(`/sources/${source}/series/${encodeURIComponent(slug)}`),

  getStatus: (source: string) => request<StatusResponse>(`/sources/${source}/status`),

  /** Runs one source's scraper now. Stored series are skipped by the backend. */
  scrape: (source: string) =>
    request<ScrapeResult>(`/sources/${source}/scrape`, { method: "POST" }),
};
