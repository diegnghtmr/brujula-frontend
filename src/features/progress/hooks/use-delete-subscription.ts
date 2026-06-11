/**
 * useDeleteSubscription — TanStack Query mutation for DELETE /me/subscriptions/{subscriptionId}
 *
 * On success, invalidates the ["subscriptions"] query so the list page
 * re-fetches and reflects the removal.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SubscriptionsApi } from "@/api/generated/api/subscriptions-api";
import { createApiInstance } from "@/api/client";

const subscriptionsApi = createApiInstance(SubscriptionsApi);

interface DeleteSubscriptionParams {
  subscriptionId: string;
}

function useDeleteSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subscriptionId }: DeleteSubscriptionParams) =>
      subscriptionsApi
        .deleteSubscription({ xXSRFTOKEN: "", subscriptionId })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
  });
}

export { useDeleteSubscription };
