import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ApplyWorkflowPayload {
  renewalId: string;
  action: string;
}

export const useApplyWorkflowAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ApplyWorkflowPayload) => {
      const res = await fetch('/api/method/jh_digitrack.api.property_management.apply_workflow_action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to apply workflow action');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Docs'] });
      toast.success('Workflow action applied successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Something went wrong');
    },
  });
};

