/**
 * useUpdateCourseAttempt — TanStack Query mutation for PUT /me/course-attempts/{id}
 *
 * Carries the attempt's current `version` for optimistic-lock safety.
 * On success, invalidates:
 *   - ["course-attempts", subscriptionId]
 *   - ["curriculum", subscriptionId]
 *   - ["progress", subscriptionId]
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ProgressApi } from "@/api/generated/api/progress-api";
import { createApiInstance } from "@/api/client";
import type { AttemptStatus } from "@/api/generated/models/attempt-status";

const progressApi = createApiInstance(ProgressApi);

interface UpdateCourseAttemptParams {
  attemptId: string;
  subscriptionId: string;
  status: AttemptStatus;
  finalGrade?: number | null;
  periodId?: string;
  journeyCode?: string;
  version: number;
}

function useUpdateCourseAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      attemptId,
      status,
      finalGrade,
      periodId,
      journeyCode,
      version,
    }: UpdateCourseAttemptParams) =>
      progressApi
        .updateCourseAttempt({
          xXSRFTOKEN: "",
          attemptId,
          courseAttemptUpdateRequest: {
            status,
            finalGrade: finalGrade ?? null,
            periodId,
            journeyCode,
            version,
          },
        })
        .then((r) => r.data),
    onSuccess: (_data, variables) => {
      const { subscriptionId } = variables;
      queryClient.invalidateQueries({ queryKey: ["course-attempts", subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ["curriculum", subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ["progress", subscriptionId] });
    },
  });
}

export { useUpdateCourseAttempt };
