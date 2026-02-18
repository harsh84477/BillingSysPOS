import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BusinessSettings {
  id: string;
  business_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  currency: string;
  currency_symbol: string;
  tax_name: string;
  tax_rate: number;
  tax_inclusive: boolean;
  bill_prefix: string;
  next_bill_number: number;
  theme: string;
  show_gst_in_billing: boolean;
  show_discount_in_billing: boolean;
  created_at: string;
  updated_at: string;
}

export function useBusinessSettings() {
  const { businessId } = useAuth();

  return useQuery({
    queryKey: ['businessSettings', businessId],
    queryFn: async () => {
      let query = supabase
        .from('business_settings')
        .select('*');
      if (businessId) query = query.eq('business_id', businessId);
      const { data, error } = await query.limit(1).maybeSingle();

      if (error) throw error;
      return data as BusinessSettings | null;
    },
    enabled: !!businessId,
  });
}

export function useUpdateBusinessSettings() {
  const queryClient = useQueryClient();
  const { businessId } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<BusinessSettings>) => {
      let query = supabase
        .from('business_settings')
        .update(updates);
      if (businessId) query = query.eq('business_id', businessId);
      const { data, error } = await query
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessSettings'] });
      toast.success('Settings updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });
}
