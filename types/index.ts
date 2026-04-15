// ─── Core Job Types ────────────────────────────────────────────────────────────

export interface RawJob {
  id: string;
  companyName: string | null;
  employmentType: string | null;
  title: string | null;
  url: string | null;
  salary: string | null;
  description: string | null;
  datePosted: string | null;
  query?: string;
  hourlyRate?: number | null;
  salaryReason?: string;
}

// Per-job AI analysis shape — matches the spec in the product brief
export interface JobAnalysis {
  title: string;
  platform_redirect: boolean;
  redirect_platform: string;
  requires_file_upload: boolean;
  required_files: string[];
  requires_cv: boolean;
  skills: string[];
  keywords: string[];
}

// A job that has been through AI analysis + scoring
export interface AnalyzedJob extends RawJob {
  analysis: JobAnalysis;
  score: number; // 0-100 relevance / quality score
}

// A job that was discarded and the reason why
export interface RemovedJob {
  job: RawJob;
  reason: string;
}

// ─── Request / Response Shapes ────────────────────────────────────────────────

export interface ScrapeOptions {
  keyword: string;
  minSalary?: number;
  maxSalary?: number;
  jobType?: 'full-time' | 'part-time' | 'freelance' | 'any';
  limit: number;
  experienceLevel?: string;
  techStack?: string;
  remoteOnly?: boolean;
  datePosted?: string;
  sessionCookie?: string;
}

// Full result returned from the /api/scrape endpoint
export interface ProcessResult {
  validJobs: AnalyzedJob[];
  removedJobs: RemovedJob[];
  topSkills: string[];
  commonRequirements: string[];
  suggestedKeywords: string[];
  bestMatches: AnalyzedJob[];
  applicationMessage: string;
  stats: {
    totalScraped: number;
    totalAnalyzed: number;
    totalRemoved: number;
    scrapePasses: number;
  };
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export type AppTab = 'jobs' | 'insights' | 'application' | 'email';

export interface User {
  name: string;
  email: string;
  avatar: string;
}
