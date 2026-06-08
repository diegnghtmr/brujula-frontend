/**
 * useSimulations — TanStack Query hook for GET /me/simulations
 */

import { useQuery } from "@tanstack/react-query";
import { SimulationsApi } from "@/api/generated/api/simulations-api";
import type { SimulationStatus } from "@/api/generated/models/simulation-status";
import { createApiInstance } from "@/api/client";

const simulationsApi = createApiInstance(SimulationsApi);

interface UseSimulationsParams {
  periodId?: string;
  status?: SimulationStatus;
}

function useSimulations(params: UseSimulationsParams = {}) {
  return useQuery({
    queryKey: ["simulations", params.periodId, params.status],
    queryFn: () =>
      simulationsApi
        .listMySimulations({ periodId: params.periodId, status: params.status })
        .then((r) => r.data),
  });
}

export { useSimulations };
