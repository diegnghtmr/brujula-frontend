/**
 * useSimulationDetail — TanStack Query hook for GET /me/simulations/:id
 */

import { useQuery } from "@tanstack/react-query";
import { SimulationsApi } from "@/api/generated/api/simulations-api";
import { createApiInstance } from "@/api/client";

const simulationsApi = createApiInstance(SimulationsApi);

function useSimulationDetail(simulationId: string | null) {
  return useQuery({
    queryKey: ["simulation", simulationId],
    queryFn: () =>
      simulationsApi
        .getSimulation({ simulationId: simulationId! })
        .then((r) => r.data),
    enabled: !!simulationId,
  });
}

export { useSimulationDetail };
