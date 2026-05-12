import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, SlidersHorizontal, ArrowUpDown, Download, RefreshCw } from 'lucide-react';

export type SortField = 'name' | 'revenue' | 'created' | 'plan' | 'staff';

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  planFilter: string;
  onPlanChange: (v: string) => void;
  categoryFilter: string;
  onCategoryChange: (v: string) => void;
  sortField: SortField;
  onSortChange: (v: SortField) => void;
  sortAsc: boolean;
  onSortDirToggle: () => void;
  plans: any[];
  categories: string[];
  filteredCount: number;
  totalCount: number;
  onExport: () => void;
  onRefresh: () => void;
}

export default function BusinessFilters({
  search, onSearchChange, statusFilter, onStatusChange,
  planFilter, onPlanChange, categoryFilter, onCategoryChange,
  sortField, onSortChange, sortAsc, onSortDirToggle,
  plans, categories, filteredCount, totalCount,
  onExport, onRefresh,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by business name, owner, or phone..." className="pl-9 h-9"
            value={search} onChange={e => onSearchChange(e.target.value)} />
        </div>

        {/* Status */}
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full sm:w-36 h-9"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trialing">Trial</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="no-plan">No Plan</SelectItem>
          </SelectContent>
        </Select>

        {/* Plan */}
        <Select value={planFilter} onValueChange={onPlanChange}>
          <SelectTrigger className="w-full sm:w-36 h-9"><SelectValue placeholder="All Plans" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            {plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Category */}
        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-full sm:w-36 h-9"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Sort */}
          <Select value={sortField} onValueChange={v => onSortChange(v as SortField)}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="plan">Plan</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onSortDirToggle} title={sortAsc ? 'Ascending' : 'Descending'}>
            <ArrowUpDown className="h-3.5 w-3.5" />
          </Button>

          <Badge variant="outline" className="text-[10px] h-6 shrink-0">
            {filteredCount} of {totalCount} business{totalCount !== 1 ? 'es' : ''}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onExport}>
            <Download className="h-3.5 w-3.5" />Export
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
