import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ApplyWorkflowPayload {
  renewal_id: string
  action: string
  target_state?: string
  comment?: string
}

export const useApplyWorkflowAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ApplyWorkflowPayload) => {
      console.log(" Workflow Debug - Payload:", payload);
      const res = await fetch('/api/method/jh_digitrack.api.property_management.apply_workflow_action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      console.log(res,"res")

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Workflow API Error:", errorData);
        throw new Error(errorData.message || 'Failed to apply workflow action');
      }

      return res.json();
    },
    onSuccess: (data) => {
      console.log(" Workflow Success:", data);
      queryClient.invalidateQueries({ queryKey: ['Docs'] });
      toast.success('Workflow action applied successfully');
    },
    onError: (error: any) => {
      console.error(" Workflow Mutation Error:", error);
      toast.error(error.message || 'Something went wrong');
    },
  });
};

