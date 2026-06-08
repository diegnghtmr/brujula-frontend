/**
 * usePeriods — TanStack Query hook for GET /periods
 */

import { useQuery } from "@tanstack/react-query";
import { OfferingsApi } from "@/api/generated/api/offerings-api";
import { createApiInstance } from "@/api/client";

const offeringsApi = createApiInstance(OfferingsApi);

function usePeriods() {
  return useQuery({
    queryKey: ["periods"],
    queryFn: () => offeringsApi.listPeriods({}).then((r) => r.data),
  });
}

export { usePeriods };
