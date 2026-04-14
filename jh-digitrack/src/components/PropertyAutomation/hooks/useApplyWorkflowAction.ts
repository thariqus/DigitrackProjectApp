import frappe from "@/utils/frappe-client";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
 
interface ApplyWorkflowPayload {
  renewal_id: string
  action: string
  target_state?: string
  comment?: string
}
 
const getWorkflowErrorMessage = (errorData: unknown) => {
  if (errorData && typeof errorData === 'object') {
    const payload = errorData as {
      message?: string;
      _server_messages?: string;
      exception?: string;
      exc?: string;
    };
 
    if (payload.message) {
      return payload.message;
    }
 
    if (payload._server_messages) {
      try {
        const serverMessages = JSON.parse(payload._server_messages) as string[];
        const firstMessage = serverMessages[0];
        if (firstMessage) {
          try {
            const parsedMessage = JSON.parse(firstMessage) as { message?: string };
            if (parsedMessage.message) {
              return parsedMessage.message;
            }
          } catch {
            return firstMessage;
          }
        }
      } catch {
        return payload._server_messages;
      }
    }
 
    if (payload.exception) {
      return payload.exception;
    }
 
    if (payload.exc) {
      return payload.exc;
    }
  }
 
  return 'Failed to apply workflow action';
};
 
export const useApplyWorkflowAction = () => {
  const queryClient = useQueryClient();
 
  return useMutation({
    mutationFn: async (payload: ApplyWorkflowPayload) => {
      try {
        return await frappe.api.post(
          'jh_digitrack.api.property_management.apply_workflow_action',
          payload
        );
      } catch (error: unknown) {
        const axiosError = error as {
          response?: {
            data?: unknown;
          };
        };
 
        const errorData = axiosError.response?.data ?? error;
        console.error("Workflow API Error:", errorData);
        throw new Error(getWorkflowErrorMessage(errorData));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Docs'] });
      queryClient.invalidateQueries({ queryKey: ['DocInfo'] });
      toast.success('Workflow action applied successfully');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      console.error(" Workflow Mutation Error:", error);
      toast.error(message);
    },
  });
};