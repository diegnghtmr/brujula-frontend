/**
 * useDuplicateSimulation — TanStack Query mutation for POST /me/simulations/:id/duplications
 *
 * Sends Idempotency-Key (uuidv4) per request.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SimulationsApi } from "@/api/generated/api/simulations-api";
import { createApiInstance } from "@/api/client";
import { generateUUID } from "./use-create-simulation";

const simulationsApi = createApiInstance(SimulationsApi);

interface DuplicateParams {
  simulationId: string;
  name?: string;
}

function useDuplicateSimulation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ simulationId, name }: DuplicateParams) =>
      simulationsApi
        .duplicateSimulation({
          idempotencyKey: generateUUID(),
          xXSRFTOKEN: "",
          simulationId,
          duplicateSimulationRequest: name ? { name } : undefined,
        })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simulations"] });
    },
  });
}

export { useDuplicateSimulation };
