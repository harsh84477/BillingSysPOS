import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  return useQuery({
    queryKey: ['businessSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as BusinessSettings | null;
    },
  });
}

export function useUpdateBusinessSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<BusinessSettings>) => {
      // First get the current settings row to find its ID
      const { data: current, error: fetchError } = await supabase
        .from('business_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!current) throw new Error('No settings found. Please set up your business first.');

      // Update by specific ID so .single() always works
      const { data, error } = await supabase
        .from('business_settings')
        .update(updates)
        .eq('id', current.id)
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
