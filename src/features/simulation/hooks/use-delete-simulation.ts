/**
 * useDeleteSimulation — TanStack Query mutation for DELETE /me/simulations/{simulationId}
 *
 * On success, invalidates the ["simulations"] query so the list page
 * re-fetches and the deleted card disappears.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SimulationsApi } from "@/api/generated/api/simulations-api";
import { createApiInstance } from "@/api/client";

const simulationsApi = createApiInstance(SimulationsApi);

interface DeleteSimulationParams {
  simulationId: string;
}

function useDeleteSimulation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ simulationId }: DeleteSimulationParams) =>
      simulationsApi
        .deleteSimulation({ xXSRFTOKEN: "", simulationId })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simulations"] });
    },
  });
}

export { useDeleteSimulation };
