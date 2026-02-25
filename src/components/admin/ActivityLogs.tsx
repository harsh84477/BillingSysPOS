// ============================================================
// ACTIVITY LOGS COMPONENT
// ============================================================
// Location: src/components/admin/ActivityLogs.tsx

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useActivityLogs } from '@/hooks/useBillingSystem';
import { Download, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ACTION_COLORS: Record<string, string> = {
  create_bill: 'bg-blue-100 text-blue-800',
  update_bill: 'bg-purple-100 text-purple-800',
  finalize_bill: 'bg-green-100 text-green-800',
  cancel_bill: 'bg-red-100 text-red-800',
  create_product: 'bg-blue-100 text-blue-800',
  update_product: 'bg-purple-100 text-purple-800',
  delete_product: 'bg-red-100 text-red-800',
  adjust_stock: 'bg-orange-100 text-orange-800',
  create_customer: 'bg-teal-100 text-teal-800',
  update_customer: 'bg-teal-100 text-teal-800',
  create_expense: 'bg-yellow-100 text-yellow-800',
  update_expense: 'bg-yellow-100 text-yellow-800',
  delete_expense: 'bg-red-100 text-red-800',
  credit_transaction: 'bg-indigo-100 text-indigo-800',
  sync_offline_data: 'bg-cyan-100 text-cyan-800',
};

interface ActivityLogsProps {
  businessId: string;
}

interface ActivityLogDetail {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  description?: string;
  old_value?: any;
  new_value?: any;
  user_id?: string;
  created_at: string;
}

export function ActivityLogs({ businessId }: ActivityLogsProps) {
  const { logs, isLoading, exportLogs } = useActivityLogs(businessId);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<ActivityLogDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filteredLogs =
    logs?.filter((log) => {
      const matchesAction = filterAction === 'all' || log.action === filterAction;
      const matchesSearch =
        searchTerm === '' ||
        log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesAction && matchesSearch;
    }) || [];

  const uniqueActions = [...new Set(logs?.map((log) => log.action) || [])];

  const handleViewDetails = (log: ActivityLogDetail) => {
    setSelectedLog(log);
    setDetailOpen(true);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading activity logs...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header with Export */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Activity Logs</h2>
          <p className="text-sm text-gray-600">
            Audit trail of all transactions and changes (visible to Owner/Manager only)
          </p>
        </div>
        <Button onClick={exportLogs} disabled={!logs || logs.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search by action, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Action</label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Showing {filteredLogs.length} of {logs?.length || 0} logs
          </p>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No activity logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-gray-50">
                      <TableCell className="text-sm">
                        <div>
                          <p className="font-medium">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{log.user_id?.substring(0, 8) || 'System'}</TableCell>
                      <TableCell>
                        <Badge
                          className={ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'}
                          variant="outline"
                        >
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm capitalize">{log.target_type}</TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                        {log.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(log)}
                          className="gap-1"
                        >
                          View <ChevronRight className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Activity Details</DialogTitle>
            <DialogDescription>
              Full details of the selected activity log
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Timestamp</p>
                  <p className="text-sm">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Action</p>
                  <Badge className={ACTION_COLORS[selectedLog.action] || 'bg-gray-100 text-gray-800'}>
                    {selectedLog.action.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Target Type</p>
                  <p className="text-sm capitalize">{selectedLog.target_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Target ID</p>
                  <p className="text-sm font-mono text-xs">{selectedLog.target_id}</p>
                </div>
              </div>

              {selectedLog.description && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Description</p>
                  <p className="text-sm bg-gray-50 p-2 rounded">{selectedLog.description}</p>
                </div>
              )}

              {selectedLog.old_value && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Previous Value</p>
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(selectedLog.old_value, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_value && (
                <div>
                  <p className="text-sm font-medium text-gray-600">New Value</p>
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(selectedLog.new_value, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
