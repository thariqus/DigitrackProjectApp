import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { delegationApi } from "../api/delegation";


export const useDelegations = () =>
  useQuery({
    queryKey: ["Delegations"],
    queryFn: delegationApi.listDelegations,
  });

export const useCreateDelegation = (options?: {
  onClose?: () => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: delegationApi.createDelegation,
    onSuccess: () => {
      toast.success("Delegation created");
      options?.onClose?.();
      queryClient.invalidateQueries({ queryKey: ["Delegations"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create delegation");
    },
  });
};
