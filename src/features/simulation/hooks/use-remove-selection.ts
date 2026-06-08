/**
 * useRemoveSelection — TanStack Query mutation for DELETE /me/simulations/:id/selections/:selId
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SimulationsApi } from "@/api/generated/api/simulations-api";
import { createApiInstance } from "@/api/client";

const simulationsApi = createApiInstance(SimulationsApi);

interface RemoveSelectionParams {
  simulationId: string;
  selectionId: string;
}

function useRemoveSelection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ simulationId, selectionId }: RemoveSelectionParams) =>
      simulationsApi
        .removeSimulationSelection({
          xXSRFTOKEN: "",
          simulationId,
          selectionId,
        })
        .then((r) => r.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["simulation", variables.simulationId] });
    },
  });
}

export { useRemoveSelection };
