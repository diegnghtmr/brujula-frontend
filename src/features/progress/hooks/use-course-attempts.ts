/**
 * useCourseAttempts — TanStack Query hook for GET /me/course-attempts?subscriptionId={id}
 *
 * Returns the content array from the paginated response.
 * Model patch required: CourseAttemptPage must be PageMeta & { content: CourseAttempt[] }
 * See src/api/generated/models/course-attempt-page.ts (Generator bug workaround — see simulation-page.ts precedent).
 */

import { useQuery } from "@tanstack/react-query";
import { ProgressApi } from "@/api/generated/api/progress-api";
import { createApiInstance } from "@/api/client";

const progressApi = createApiInstance(ProgressApi);

interface UseCourseAttemptsParams {
  subscriptionId: string;
  page?: number;
  size?: number;
}

function useCourseAttempts({ subscriptionId, page = 0, size = 20 }: UseCourseAttemptsParams) {
  return useQuery({
    queryKey: ["course-attempts", subscriptionId, page, size],
    queryFn: () =>
      progressApi
        .listMyCourseAttempts({ subscriptionId, page, size })
        .then((r) => r.data),
    enabled: !!subscriptionId,
  });
}

export { useCourseAttempts };
