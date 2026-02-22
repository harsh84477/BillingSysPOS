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
  invoice_style: 'classic' | 'modern' | 'detailed';
  invoice_font_size: number;
  invoice_spacing: number;
  invoice_show_borders: boolean;
  invoice_show_item_price: boolean;
  invoice_footer_message: string | null;
  invoice_footer_font_size?: number;
  invoice_header_align?: 'left' | 'center' | 'right';
  invoice_show_business_phone?: boolean;
  invoice_show_business_email?: boolean;
  invoice_show_business_address?: boolean;
  invoice_terms_conditions?: string | null;
  invoice_paper_width?: '58mm' | '80mm' | 'A4';
  invoice_show_qr_code?: boolean;
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
      return (data as unknown) as BusinessSettings | null;
    },
    enabled: !!businessId,
  });
}

export function useUpdateBusinessSettings() {
  const queryClient = useQueryClient();
  const { businessId } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<BusinessSettings>) => {
      // Update settings for this business
      const { data, error } = await supabase
        .from('business_settings')
        .update({ ...updates, business_id: businessId })
        .eq('business_id', businessId)
        .select()
        .maybeSingle();

      if (error) throw error;

      // If no row matched (legacy row with NULL business_id), claim it
      if (!data && businessId) {
        const { data: claimed, error: claimError } = await supabase
          .from('business_settings')
          .update({ ...updates, business_id: businessId })
          .is('business_id', null)
          .select()
          .maybeSingle();
        if (claimError) throw claimError;
        return claimed;
      }

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
