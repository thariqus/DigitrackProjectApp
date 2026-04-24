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

export const useDocumentDelegation = (
  reference_doctype?: string,
  reference_name?: string,
) =>
  useQuery({
    queryKey: ["DocumentDelegation", reference_doctype, reference_name],
    queryFn: () =>
      delegationApi.getDocumentDelegation(
        reference_doctype || "",
        reference_name || "",
      ),
    enabled: !!reference_doctype && !!reference_name,
  });

export const useRevokeDelegation = (options?: {
  onSuccess?: () => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: delegationApi.revokeDelegation,
    onSuccess: () => {
      toast.success("Delegation revoked");
      options?.onSuccess?.();
      queryClient.invalidateQueries({ queryKey: ["Delegations"] });
      queryClient.invalidateQueries({ queryKey: ["DocumentDelegation"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke delegation");
    },
  });
};
