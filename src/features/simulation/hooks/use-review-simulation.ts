/**
 * useReviewSimulation — TanStack Query mutation for POST /me/simulations/:id/review
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SimulationsApi } from "@/api/generated/api/simulations-api";
import { createApiInstance } from "@/api/client";

const simulationsApi = createApiInstance(SimulationsApi);

function useReviewSimulation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (simulationId: string) =>
      simulationsApi
        .reviewSimulation({
          xXSRFTOKEN: "",
          simulationId,
        })
        .then((r) => r.data),
    onSuccess: (_data, simulationId) => {
      queryClient.invalidateQueries({ queryKey: ["simulation", simulationId] });
      queryClient.invalidateQueries({ queryKey: ["simulations"] });
    },
  });
}

export { useReviewSimulation };
