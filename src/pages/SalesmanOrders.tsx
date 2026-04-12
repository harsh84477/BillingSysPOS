/**
 * pages/SalesmanOrders.tsx — Salesman Orders (Pending Bills)
 *
 * Lists all bills created by salesmen with status 'pending'.
 * Features:
 *  - Shows customer name, items count, total amount, created date
 *  - Owner/manager can see all salesmen's orders
 *  - Salesman sees only their own orders
 *  - Click to view or finalize (mark as complete)
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, User, Clock, Search } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';

export default function SalesmanOrders() {
  const queryClient = useQueryClient();
  const { businessId, user, userRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['salesmanOrders', businessId, user?.id, userRole],
    queryFn: async () => {
      let query = supabase
        .from('bills')
        .select('*, customers(name, phone, address), profiles:created_by(display_name)')
        .eq('business_id', businessId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (userRole === 'salesman') {
        query = query.eq('created_by', user?.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const filteredOrders = orders.filter(bill =>
    bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (bill.customers?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Finalize a pending bill (owner/manager only)
  async function finalizeBill(bill) {
    await supabase
      .from('bills')
      .update({ status: 'complete' })
      .eq('id', bill.id);
    // Update target progress again (if not already counted)
    await supabase.rpc('increment_salesman_target', {
      p_business_id: bill.business_id,
      p_salesman_id: bill.created_by,
      p_bill_amount: bill.total_amount,
      p_bill_date: bill.created_at,
    });
    // Invalidate queries so dashboard/targets update
    queryClient.invalidateQueries();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salesman Orders</CardTitle>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Search by bill number or customer..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Salesman</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map(bill => (
              <TableRow key={bill.id}>
                <TableCell>{bill.bill_number}</TableCell>
                <TableCell>{bill.customers?.name || '-'}</TableCell>
                <TableCell>{bill.profiles?.display_name || '-'}</TableCell>
                <TableCell>{bill.items?.length || '-'}</TableCell>
                <TableCell>₹{bill.total_amount}</TableCell>
                <TableCell><Badge variant="outline">{bill.status}</Badge></TableCell>
                <TableCell>{format(new Date(bill.created_at), 'dd MMM, hh:mm a')}</TableCell>
                <TableCell>
                  {/* Finalize button for owner/manager */}
                  {(userRole === 'owner' || userRole === 'manager') && bill.status === 'pending' && (
                    <Button size="sm" variant="default" onClick={() => finalizeBill(bill)}>Finalize</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredOrders.length === 0 && !isLoading && (
          <div className="text-center text-muted-foreground py-10">No orders found.</div>
        )}
      </CardContent>
    </Card>
  );
}
