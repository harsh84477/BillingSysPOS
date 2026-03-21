import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings, useUpdateBusinessSettings } from '@/hooks/useBusinessSettings';
import { toast } from 'sonner';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { 
  SettingsCard, ColStack, FieldLabel, TextInput, TextArea, SaveBtn, T, op 
} from '../SettingsUI';

export default function BusinessTab() {
  const { isAdmin, user, businessInfo, refreshBusinessInfo } = useAuth();
  const { data: settings } = useBusinessSettings();
  const updateSettings = useUpdateBusinessSettings();
  
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleBusinessSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    updateSettings.mutate({
      business_name: fd.get('business_name') as string,
      address: fd.get('address') as string,
      phone: fd.get('phone') as string,
      email: fd.get('email') as string
    });
  };

  const handleRegenerateCode = async () => {
    if (!confirm('Regenerating the code will make the old code invalid. Continue?')) return;
    setRegenerating(true);
    try {
      const { data, error } = await supabase.rpc('regenerate_join_code', { _user_id: user!.id });
      if (error) throw error;
      const result = data as any;
      if (result.success) {
        toast.success('Join code regenerated!');
        await refreshBusinessInfo();
      } else {
        toast.error(result.error);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <ColStack>
      <SettingsCard title="Business Information" subtitle="Your business details that appear on invoices" icon="🏢" accent="#10b981">
        <form onSubmit={handleBusinessSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5">
            <div><FieldLabel htmlFor="business_name">Business Name</FieldLabel><TextInput id="business_name" name="business_name" defaultValue={settings?.business_name} disabled={!isAdmin} /></div>
            <div><FieldLabel htmlFor="email">Email</FieldLabel><TextInput id="email" name="email" type="email" defaultValue={settings?.email || ''} disabled={!isAdmin} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5">
            <div className="flex-1">
              <FieldLabel htmlFor="phone">Phone</FieldLabel>
              <TextInput id="phone" name="phone" defaultValue={settings?.phone || ''} disabled={!isAdmin} />
            </div>
            <div className="flex-1">
              <FieldLabel htmlFor="gst_number">GST Number</FieldLabel>
              <TextInput 
                id="gst_number" 
                placeholder="e.g. 22AAAAA0000A1Z5" 
                defaultValue={settings?.gst_number || ''} 
                onBlur={(e) => isAdmin && updateSettings.mutate({ gst_number: e.target.value })} 
                disabled={!isAdmin} 
              />
            </div>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <FieldLabel htmlFor="address">Address</FieldLabel>
            <TextArea id="address" name="address" defaultValue={settings?.address || ''} disabled={!isAdmin} rows={2} />
          </div>
          {isAdmin && <SaveBtn label="Save Changes" />}
        </form>
      </SettingsCard>

      {isAdmin && businessInfo && (
        <SettingsCard title="Team Join Code" subtitle="Share this code with your team to let them join" icon="🔑" accent="#8b5cf6">
          <div style={{ border: `2px dashed ${op('#8b5cf6', 40)}`, borderRadius: '12px', background: op('#8b5cf6', 8), padding: '28px', textAlign: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <span style={{ fontSize: '32px', fontFamily: 'monospace', fontWeight: 800, letterSpacing: '0.3em', color: '#8b5cf6' }}>{businessInfo.join_code}</span>
              <button 
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(businessInfo.join_code);
                  setCopied(true);
                  toast.success('Code copied!');
                  setTimeout(() => setCopied(false), 2000);
                }}
                style={{ width: '36px', height: '36px', border: `1px solid ${T.color.border}`, borderRadius: '8px', background: T.color.cardBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>
            <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>Max 8 members per business</p>
          </div>
          <button 
            type="button"
            onClick={handleRegenerateCode} 
            disabled={regenerating}
            style={{ width: '100%', padding: '10px', border: `1px solid ${T.color.border}`, borderRadius: '8px', background: T.color.cardBg, color: T.color.textPri, cursor: 'pointer', fontFamily: T.font, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} /> Regenerate Code
          </button>
        </SettingsCard>
      )}
    </ColStack>
  );
}
