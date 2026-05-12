import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Mail, Phone, MapPin, Shield, Calendar, Hash, Globe } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  business: any;
  settings: any;
}

const FIELDS = [
  { key: 'owner_name', label: 'Owner', icon: Building2 },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'phone', label: 'Phone', icon: Phone },
  { key: 'address', label: 'Address', icon: MapPin },
  { key: 'gstin', label: 'GST Number', icon: Shield },
  { key: 'business_category', label: 'Business Type', icon: Globe },
  { key: 'join_code', label: 'Join Code', icon: Hash },
  { key: 'created_at', label: 'Registered', icon: Calendar, isDate: true },
];

export default function BusinessInfoCard({ business, settings }: Props) {
  const data: Record<string, any> = {
    owner_name: business?.owner_name || business?.mobile_number || '—',
    email: settings?.email || business?.email || '—',
    phone: settings?.phone || business?.mobile_number || '—',
    address: settings?.address || '—',
    gstin: settings?.gstin || '—',
    business_category: settings?.business_category || '—',
    join_code: business?.join_code || '—',
    created_at: business?.created_at,
  };

  return (
    <Card className="border-slate-200/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />Business Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          {FIELDS.map(field => {
            const val = data[field.key];
            const display = field.isDate && val ? format(new Date(val), 'MMM dd, yyyy') : String(val || '—');
            return (
              <div key={field.key} className="flex items-start gap-3 py-1.5">
                <div className="h-7 w-7 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
                  <field.icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{field.label}</p>
                  <p className="text-sm font-medium truncate">{display}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
