// Per-user data in Firestore:
//   users/{uid}/favorites/{jobKey}   saved jobs
//   users/{uid}/interests/{key}      dashboard preference chips

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { COLLECTIONS, db } from "@/integrations/firebase/client";

export interface Favorite {
  id: string;
  job_id: string;
  job_title: string;
  company_name: string;
  created_at: string;
}

export interface Interest {
  id: string;
  category: string;
  value: string;
}

/** Job ids contain "#"; keep document ids simple and reversible. */
const keyFor = (jobId: string) => encodeURIComponent(jobId);

const favoritesCol = (userId: string) => collection(db, COLLECTIONS.users, userId, "favorites");
const interestsCol = (userId: string) => collection(db, COLLECTIONS.users, userId, "interests");

const toIso = (v: unknown) => {
  const ts = v as { toDate?: () => Date } | null;
  return ts && typeof ts.toDate === "function" ? ts.toDate().toISOString() : new Date().toISOString();
};

export async function listFavorites(userId: string): Promise<Favorite[]> {
  const snap = await getDocs(query(favoritesCol(userId), orderBy("created_at", "desc")));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      job_id: String(data.job_id ?? decodeURIComponent(d.id)),
      job_title: String(data.job_title ?? ""),
      company_name: String(data.company_name ?? ""),
      created_at: toIso(data.created_at),
    };
  });
}

export async function addFavorite(
  userId: string,
  job: { id: string; job_title: string; company_name: string },
) {
  await setDoc(doc(favoritesCol(userId), keyFor(job.id)), {
    job_id: job.id,
    job_title: job.job_title,
    company_name: job.company_name,
    created_at: serverTimestamp(),
  });
}

export async function removeFavorite(userId: string, favoriteIdOrJobId: string) {
  const id = favoriteIdOrJobId.includes("#") ? keyFor(favoriteIdOrJobId) : favoriteIdOrJobId;
  await deleteDoc(doc(favoritesCol(userId), id));
}

export async function listInterests(userId: string): Promise<Interest[]> {
  const snap = await getDocs(interestsCol(userId));
  return snap.docs.map((d) => ({
    id: d.id,
    category: String(d.data().category ?? ""),
    value: String(d.data().value ?? ""),
  }));
}

export async function addInterest(userId: string, category: string, value: string): Promise<Interest> {
  const id = encodeURIComponent(`${category}:${value}`);
  await setDoc(doc(interestsCol(userId), id), { category, value, created_at: serverTimestamp() });
  return { id, category, value };
}

export async function removeInterest(userId: string, id: string) {
  await deleteDoc(doc(interestsCol(userId), id));
}
