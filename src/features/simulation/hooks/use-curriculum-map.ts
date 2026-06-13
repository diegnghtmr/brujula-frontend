/**
 * use-curriculum-map — fetches subscriptions + per-subscription curricula,
 * builds Map<courseId, CurriculumMapEntry> for eligibility derivation.
 * Also returns programNames Map<programId, programName> for display purposes.
 *
 * Self-contained: OfferingBrowser does NOT need new props on SimulationDetailPage.
 * React Compiler is ON: no useMemo/useCallback.
 */

import { useQuery, useQueries } from "@tanstack/react-query";
import { SubscriptionsApi } from "@/api/generated/api/subscriptions-api";
import { ProgressApi } from "@/api/generated/api/progress-api";
import { createApiInstance } from "@/api/client";
import type { SimulationScopeEntry } from "@/api/generated/models/simulation-scope-entry";
import type { CurriculumMapEntry } from "../lib/eligibility";

// ─── Module-level API instances (stable, no re-creation on render) ─────────────

const subscriptionsApi = createApiInstance(SubscriptionsApi);
const progressApi = createApiInstance(ProgressApi);

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseCurriculumMapResult {
  /** Key = courseId */
  map: Map<string, CurriculumMapEntry>;
  /** Key = programId, value = programName */
  programNames: Map<string, string>;
  isLoading: boolean;
  /**
   * true if any scope entry had no matching subscription OR any curriculum
   * query errored. Does NOT block render — affected courses fall back to unknown.
   */
  isDegraded: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useCurriculumMap(scopeEntries: SimulationScopeEntry[]): UseCurriculumMapResult {
  // Step 1: fetch all student subscriptions (single query, cached)
  const subscriptionsQuery = useQuery({
    queryKey: ["subscriptions", "me"],
    queryFn: () => subscriptionsApi.listMySubscriptions().then((r) => r.data),
    enabled: scopeEntries.length > 0,
  });

  const subscriptions = subscriptionsQuery.data ?? [];

  // Build programNames from fetched subscriptions
  const programNames = new Map<string, string>();
  for (const sub of subscriptions) {
    if (sub.programId && sub.programName) {
      programNames.set(sub.programId, sub.programName);
    }
  }

  // Step 2: match each scope entry to a subscription by programId + journeyCode
  // Deduplicate matched ids (a subscription can cover multiple scope entries)
  const matchedIds: string[] = [];
  const seen = new Set<string>();

  for (const entry of scopeEntries) {
    const match = subscriptions.find(
      (sub) =>
        sub.programId === entry.programId &&
        sub.referenceJourney?.code === entry.journeyCode
    );
    if (match && !seen.has(match.id)) {
      seen.add(match.id);
      matchedIds.push(match.id);
    }
  }

  // Step 3: fetch curriculum per matched subscription (parallel, independent cache)
  const curriculumQueries = useQueries({
    queries: matchedIds.map((subscriptionId) => ({
      queryKey: ["curriculum", subscriptionId],
      queryFn: () =>
        progressApi
          .getSubscriptionCurriculum({ subscriptionId })
          .then((r) => r.data),
      enabled: subscriptionsQuery.isSuccess,
    })),
  });

  // Step 4: build the map from all resolved curricula
  const map = new Map<string, CurriculumMapEntry>();

  for (const query of curriculumQueries) {
    if (!query.data) continue;

    for (const semester of query.data.semesters) {
      for (const course of semester.courses) {
        map.set(course.courseId, {
          course,
          recommendedSemester: semester.recommendedSemester,
        });
      }
    }
  }

  // Determine loading and degraded states
  const isSubscriptionsLoading = subscriptionsQuery.isLoading;
  const isCurriculumLoading = curriculumQueries.some((q) => q.isLoading);
  const isLoading = isSubscriptionsLoading || isCurriculumLoading;

  // Distinct scope entries by programId+journeyCode
  const distinctScopeCount = new Set(
    scopeEntries.map((e) => `${e.programId}:${e.journeyCode}`)
  ).size;

  const isDegraded =
    subscriptionsQuery.isError ||
    (subscriptionsQuery.isSuccess && matchedIds.length < distinctScopeCount) ||
    curriculumQueries.some((q) => q.isError);

  return { map, programNames, isLoading, isDegraded };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export { useCurriculumMap };
export type { UseCurriculumMapResult };
