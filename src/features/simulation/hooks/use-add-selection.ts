/**
 * useAddSelection — TanStack Query mutation for POST /me/simulations/:id/selections
 *
 * Sends Idempotency-Key (uuidv4) per request.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SimulationsApi } from "@/api/generated/api/simulations-api";
import type { SimulationSelectionCreateRequest } from "@/api/generated/models/simulation-selection-create-request";
import { createApiInstance } from "@/api/client";
import { generateUUID } from "./use-create-simulation";

const simulationsApi = createApiInstance(SimulationsApi);

interface AddSelectionParams {
  simulationId: string;
  request: SimulationSelectionCreateRequest;
}

function useAddSelection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ simulationId, request }: AddSelectionParams) =>
      simulationsApi
        .addSimulationSelection({
          idempotencyKey: generateUUID(),
          xXSRFTOKEN: "",
          simulationId,
          simulationSelectionCreateRequest: request,
        })
        .then((r) => r.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["simulation", variables.simulationId] });
    },
  });
}

export { useAddSelection };
