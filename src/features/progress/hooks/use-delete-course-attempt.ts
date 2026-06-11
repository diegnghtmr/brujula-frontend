/**
 * useDeleteCourseAttempt — TanStack Query mutation for DELETE /me/course-attempts/{id}
 *
 * On success, invalidates:
 *   - ["course-attempts", subscriptionId]
 *   - ["curriculum", subscriptionId]
 *   - ["progress", subscriptionId]
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ProgressApi } from "@/api/generated/api/progress-api";
import { createApiInstance } from "@/api/client";

const progressApi = createApiInstance(ProgressApi);

interface DeleteCourseAttemptParams {
  attemptId: string;
  subscriptionId: string;
}

function useDeleteCourseAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ attemptId }: DeleteCourseAttemptParams) =>
      progressApi
        .deleteCourseAttempt({
          xXSRFTOKEN: "",
          attemptId,
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

export { useDeleteCourseAttempt };
