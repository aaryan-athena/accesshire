// Live job data: every listing on the portal comes straight from the Firestore
// `companies` collection the employer intake form writes to. There is no copy,
// no sync step and no demo data — what employers submit is what candidates see.

import { collection, getDocs } from "firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import { COLLECTIONS, db } from "@/integrations/firebase/client";
import { mapCompanies, type RejectedRecord } from "@/lib/intakeAdapter";
import { isRecommendable } from "@/lib/canonical";
import type { JobListing } from "@/lib/matcher";

export interface CompanySummary {
  id: string;
  name: string;
  website: string | null;
  sector: string;
  cities: string[];
  roles: number;
  openRoles: number;
}

export interface JobFeed {
  jobs: JobListing[];
  rejected: RejectedRecord[];
  companies: CompanySummary[];
  fetchedAt: string;
}

export async function fetchJobFeed(): Promise<JobFeed> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.companies));
  const { jobs, rejected } = mapCompanies(
    snapshot.docs.map((d) => ({ id: d.id, data: d.data() })),
  );

  // Newest submissions first.
  jobs.sort((a, b) => (b.source_created_at ?? "").localeCompare(a.source_created_at ?? ""));

  const byCompany = new Map<string, CompanySummary>();
  for (const job of jobs) {
    // Only names the employer typed themselves are shown as company names.
    if (job.company_name_source !== "stated" || !job.company_name) continue;
    const key = job.company_name.toLowerCase();
    const entry = byCompany.get(key) ?? {
      id: job.company_id,
      name: job.company_name,
      website: job.company_website,
      sector: job.sector,
      cities: job.cities,
      roles: 0,
      openRoles: 0,
    };
    entry.roles += 1;
    if (isRecommendable(job.availability_status)) entry.openRoles += 1;
    byCompany.set(key, entry);
  }

  return {
    jobs,
    rejected,
    companies: [...byCompany.values()].sort((a, b) => a.name.localeCompare(b.name)),
    fetchedAt: new Date().toISOString(),
  };
}

export const JOB_FEED_KEY = ["job-feed"] as const;

/** Shared, cached job feed. Every page that lists jobs reads the same query. */
export const useJobFeed = () =>
  useQuery({
    queryKey: JOB_FEED_KEY,
    queryFn: fetchJobFeed,
    staleTime: 60_000,
  });
