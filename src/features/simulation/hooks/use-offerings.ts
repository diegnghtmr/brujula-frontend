/**
 * useOfferings — TanStack Query hook for GET /offerings (paginated, filtered)
 */

import { useQuery } from "@tanstack/react-query";
import { OfferingsApi } from "@/api/generated/api/offerings-api";
import { createApiInstance } from "@/api/client";

const offeringsApi = createApiInstance(OfferingsApi);

interface UseOfferingsParams {
  periodId: string;
  programId?: string;
}

function useOfferings({ periodId, programId }: UseOfferingsParams) {
  return useQuery({
    queryKey: ["offerings", periodId, programId],
    queryFn: () =>
      offeringsApi
        .listOfferings({ periodId, programId })
        .then((r) => r.data),
    enabled: !!periodId,
  });
}

export { useOfferings };
