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
  invoice_paper_width?: '58mm' | '80mm' | 'A4' | 'A5';
  invoice_show_qr_code?: boolean;
  upi_id?: string | null;
  gst_number?: string | null;
  invoice_show_gst?: boolean;
  invoice_show_unit_price?: boolean;
  invoice_show_case?: boolean;
  invoice_title?: string;
  invoice_title_align?: 'left' | 'center' | 'right';
  invoice_contact_separate_lines?: boolean;
  invoice_column_headers_bold?: boolean;
  invoice_grid_thickness?: number;
  invoice_item_desc_style?: string;
  invoice_mrp_style?: string;
  invoice_discount_style?: string;
  invoice_gst_style?: string;
  invoice_border_top?: boolean;
  invoice_border_bottom?: boolean;
  invoice_border_left?: boolean;
  invoice_border_right?: boolean;
  invoice_border_inner_v?: boolean;
  invoice_border_inner_h?: boolean;
  invoice_qr_position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  invoice_qr_size?: 'small' | 'medium' | 'large';
  invoice_border_whole_bill?: boolean;
  invoice_margin?: number;
  invoice_padding?: number;
  invoice_business_name_style?: string;
  invoice_address_style?: string;
  invoice_phone_style?: string;
  invoice_email_style?: string;
  invoice_gst_number_style?: string;
  invoice_footer_msg_style?: string;
  invoice_terms_style?: string;
  invoice_footer_align?: 'left' | 'center' | 'right';
  invoice_footer_spacing?: number;
  // Product grid display settings
  product_button_size?: 'small' | 'medium' | 'large' | 'xlarge';
  product_columns?: number;
  grid_gap?: number;
  // Mobile-specific product display settings (new)
  mobile_product_button_size?: 'small' | 'medium' | 'large';
  mobile_product_columns?: number;
  mobile_grid_gap?: number;
  show_stock_badge?: boolean;
  show_product_code?: boolean;
  show_cost_price?: boolean;
  auto_fit_enabled?: boolean;
  // Checkout button toggles
  checkout_save_enabled?: boolean;
  checkout_print_enabled?: boolean;
  checkout_save_print_enabled?: boolean;
  checkout_whatsapp_enabled?: boolean;
  checkout_draft_enabled?: boolean;
  ask_quantity_first?: boolean;
  default_payment_method?: string;
  enable_payment_cash?: boolean;
  enable_payment_online?: boolean;
  enable_payment_split?: boolean;
  enable_payment_due?: boolean;
  // Print Settings — Regular Printer
  print_regular_layout?: string;
  print_regular_default?: boolean;
  print_repeat_header?: boolean;
  print_company_name?: boolean;
  print_company_name_text?: string;
  print_company_logo?: boolean;
  print_show_address?: boolean;
  print_show_email?: boolean;
  print_show_phone?: boolean;
  print_show_gstin?: boolean;
  print_paper_size?: string;
  print_orientation?: string;
  print_company_name_size?: string;
  print_invoice_text_size?: string;
  print_total_item_quantity?: boolean;
  print_amount_decimal?: boolean;
  print_received_amount?: boolean;
  print_balance_amount?: boolean;
  print_current_balance?: boolean;
  print_tax_details?: boolean;
  print_you_saved?: boolean;
  print_amount_grouping?: boolean;
  print_amount_words?: boolean;
  print_amount_words_format?: string;
  print_description?: boolean;
  print_terms_conditions?: string;
  print_received_by?: boolean;
  print_delivered_by?: boolean;
  print_signature_text?: string;
  print_payment_mode?: boolean;
  print_acknowledgement?: boolean;
  // Print Settings — Thermal Printer
  print_thermal_layout?: string;
  print_thermal_default?: boolean;
  print_thermal_page_size?: string;
  print_thermal_page_width?: number;
  print_thermal_printing_type?: string;
  print_thermal_bold?: boolean;
  print_thermal_auto_cut?: boolean;
  print_thermal_open_drawer?: boolean;
  print_thermal_extra_lines?: number;
  print_thermal_copies?: number;
  print_thermal_company_name?: boolean;
  print_thermal_company_name_text?: string;
  print_thermal_company_logo?: boolean;
  print_thermal_show_address?: boolean;
  print_thermal_show_email?: boolean;
  print_thermal_show_phone?: boolean;
  print_thermal_show_gstin?: boolean;
  // Print Settings V2 — Color, Copy, Item Table, Bank Details
  print_accent_color?: string;
  print_primary_color?: string;
  print_secondary_color?: string;
  print_original_duplicate?: boolean;
  print_copy_original?: boolean;
  print_copy_duplicate?: boolean;
  print_copy_triplicate?: boolean;
  print_extra_space_top?: number;
  print_min_table_rows?: number;
  print_show_item_number?: boolean;
  print_show_hsn_sac?: boolean;
  print_show_quantity?: boolean;
  print_show_mrp?: boolean;
  print_show_price_unit?: boolean;
  print_show_discount?: boolean;
  print_show_tax_pct?: boolean;
  print_show_gst?: boolean;
  print_show_currency?: boolean;
  print_bank_details?: boolean;
  print_bank_name?: string;
  print_bank_account?: string;
  print_bank_ifsc?: string;
  print_upi_qr?: boolean;
  print_pay_now_btn?: boolean;
  print_show_signature?: boolean;
  print_keep_footer_together?: boolean;
  print_qr_with_amount?: boolean;
  print_signature_image?: string | null;
  print_show_mrp_total?: boolean;
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
