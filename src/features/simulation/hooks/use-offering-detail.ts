/**
 * useOfferingDetail — TanStack Query hook for GET /offerings/:id
 */

import { useQuery } from "@tanstack/react-query";
import { OfferingsApi } from "@/api/generated/api/offerings-api";
import { createApiInstance } from "@/api/client";

const offeringsApi = createApiInstance(OfferingsApi);

function useOfferingDetail(offeringId: string | null) {
  return useQuery({
    queryKey: ["offering", offeringId],
    queryFn: () =>
      offeringsApi.getOffering({ offeringId: offeringId! }).then((r) => r.data),
    enabled: !!offeringId,
  });
}

export { useOfferingDetail };
