import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface SendbackOptionsResponse {
  actions: string[];
  sendback_options: string[];
}

interface SendbackOption {
  label: string;
  value: string;
}

const STATE_LABEL_MAP: Record<string, string> = {
  'Draft': 'Licensing Team (Initial)',
  'Pending Approver 1': 'Division Head (Approver 1)',
  'Pending Approver 2': 'Division GM (Approver 2)',
  'Pending CFO': 'CFO',
  'Pending MD': 'MD',
  'Pending Property PO': 'Property PO Team',
  'Pending Cheque Details': 'Cheque Details Team',
  'Pending MIRO': 'MIRO Team'
};

export const useGetSendbackOptions = (renewalId: string | null) => {
  return useQuery({
    queryKey: ['sendback_options', renewalId],
    queryFn: async (): Promise<SendbackOption[]> => {
      if (!renewalId) {
        return [];
      }

      const res = await fetch(`/api/method/jh_digitrack.api.property_management.get_allowed_actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ renewal_id: renewalId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch sendback options');
      }

      const data: SendbackOptionsResponse = await res.json();

      return data.sendback_options.map((state) => ({
        label: STATE_LABEL_MAP[state] || state,
        value: state
      })).filter(Boolean); // Filter out any invalid mappings
    },
    enabled: !!renewalId,
    onError: (error: any) => {
      console.error('Sendback options error:', error);
      toast.error(error.message || 'Failed to load sendback options');
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
