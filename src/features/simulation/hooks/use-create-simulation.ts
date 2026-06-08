/**
 * useCreateSimulation — TanStack Query mutation for POST /me/simulations
 *
 * Sends Idempotency-Key (uuidv4) per request.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SimulationsApi } from "@/api/generated/api/simulations-api";
import type { SimulationCreateRequest } from "@/api/generated/models/simulation-create-request";
import { createApiInstance } from "@/api/client";

const simulationsApi = createApiInstance(SimulationsApi);

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function useCreateSimulation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SimulationCreateRequest) =>
      simulationsApi
        .createSimulation({
          idempotencyKey: generateUUID(),
          xXSRFTOKEN: "",
          simulationCreateRequest: request,
        })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simulations"] });
    },
  });
}

export { useCreateSimulation, generateUUID };
