import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  MessageSquare, Plus, Search, Clock, CheckCircle2,
  AlertCircle, XCircle, ChevronRight, ArrowLeft,
  Filter, AlertTriangle, Info, Flame
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  business_name: string;
  created_at: string;
  updated_at: string;
  notes: { text: string; date: string }[];
}

const STORAGE_KEY = 'pos_support_tickets';
const generateId = () => `TK-${Date.now().toString(36).toUpperCase()}`;

function loadTickets(): Ticket[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveTickets(tickets: Ticket[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700', icon: Flame, sortOrder: 0 },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle, sortOrder: 1 },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700', icon: AlertCircle, sortOrder: 2 },
  low: { label: 'Low', color: 'bg-blue-100 text-blue-700', icon: Info, sortOrder: 3 },
};

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700', icon: Clock },
  resolved: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  closed: { label: 'Closed', color: 'bg-slate-100 text-slate-600', icon: XCircle },
};

export default function SupportTicketsTab() {
  const [tickets, setTickets] = useState<Ticket[]>(loadTickets);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newNote, setNewNote] = useState('');

  // Create form state
  const [form, setForm] = useState({ subject: '', description: '', priority: 'medium' as Ticket['priority'], business_name: '' });

  const updateTickets = useCallback((updater: (prev: Ticket[]) => Ticket[]) => {
    setTickets(prev => {
      const next = updater(prev);
      saveTickets(next);
      return next;
    });
  }, []);

  const handleCreate = () => {
    if (!form.subject.trim()) { toast.error('Subject is required'); return; }
    const ticket: Ticket = {
      id: generateId(),
      subject: form.subject.trim(),
      description: form.description.trim(),
      priority: form.priority,
      status: 'open',
      business_name: form.business_name.trim() || 'General',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: [],
    };
    updateTickets(prev => [ticket, ...prev]);
    setForm({ subject: '', description: '', priority: 'medium', business_name: '' });
    setIsCreateOpen(false);
    toast.success(`Ticket ${ticket.id} created`);
  };

  const handleStatusChange = (ticketId: string, newStatus: Ticket['status']) => {
    updateTickets(prev => prev.map(t =>
      t.id === ticketId ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t
    ));
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, status: newStatus, updated_at: new Date().toISOString() } : null);
    }
    toast.success(`Status updated to ${STATUS_CONFIG[newStatus].label}`);
  };

  const handlePriorityChange = (ticketId: string, newPriority: Ticket['priority']) => {
    updateTickets(prev => prev.map(t =>
      t.id === ticketId ? { ...t, priority: newPriority, updated_at: new Date().toISOString() } : t
    ));
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, priority: newPriority, updated_at: new Date().toISOString() } : null);
    }
    toast.success('Priority updated');
  };

  const handleAddNote = (ticketId: string) => {
    if (!newNote.trim()) return;
    const note = { text: newNote.trim(), date: new Date().toISOString() };
    updateTickets(prev => prev.map(t =>
      t.id === ticketId ? { ...t, notes: [...t.notes, note], updated_at: new Date().toISOString() } : t
    ));
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, notes: [...prev.notes, note], updated_at: new Date().toISOString() } : null);
    }
    setNewNote('');
    toast.success('Note added');
  };

  const handleDelete = (ticketId: string) => {
    updateTickets(prev => prev.filter(t => t.id !== ticketId));
    setSelectedTicket(null);
    toast.success('Ticket deleted');
  };

  // Stats
  const stats = useMemo(() => ({
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
    total: tickets.length,
  }), [tickets]);

  const filtered = useMemo(() => {
    return tickets
      .filter(t => {
        const matchSearch = !search || t.subject.toLowerCase().includes(search.toLowerCase()) || t.business_name.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || t.status === statusFilter;
        const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
        return matchSearch && matchStatus && matchPriority;
      })
      .sort((a, b) => PRIORITY_CONFIG[a.priority].sortOrder - PRIORITY_CONFIG[b.priority].sortOrder || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [tickets, search, statusFilter, priorityFilter]);

  // Detail View
  if (selectedTicket) {
    const t = selectedTicket;
    const pConfig = PRIORITY_CONFIG[t.priority];
    const sConfig = STATUS_CONFIG[t.status];
    const PIcon = pConfig.icon;
    const SIcon = sConfig.icon;
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground -ml-2" onClick={() => setSelectedTicket(null)}>
          <ArrowLeft className="h-3.5 w-3.5" />All Tickets
        </Button>

        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] font-mono">{t.id}</Badge>
              <Badge className={cn('text-[10px] gap-1', pConfig.color)}><PIcon className="h-3 w-3" />{pConfig.label}</Badge>
              <Badge className={cn('text-[10px] gap-1', sConfig.color)}><SIcon className="h-3 w-3" />{sConfig.label}</Badge>
            </div>
            <h2 className="text-xl font-bold">{t.subject}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t.business_name} · Created {format(new Date(t.created_at), 'MMM dd, yyyy HH:mm')}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={t.status} onValueChange={(v) => handleStatusChange(t.id, v as Ticket['status'])}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={t.priority} onValueChange={(v) => handlePriorityChange(t.id, v as Ticket['priority'])}>
              <SelectTrigger className="w-32 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="destructive" size="sm" className="h-9 text-xs" onClick={() => handleDelete(t.id)}>Delete</Button>
          </div>
        </div>

        {t.description && (
          <Card className="border-slate-200/70 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Description</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.description}</p></CardContent>
          </Card>
        )}

        {/* Notes Timeline */}
        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Activity & Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {t.notes.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No notes yet. Add the first one below.</p>}
            {t.notes.map((note, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                <div>
                  <p className="text-sm">{note.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(note.date), 'MMM dd, yyyy HH:mm')}</p>
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-2 border-t border-dashed">
              <Textarea placeholder="Add a note..." className="min-h-[60px] text-sm" value={newNote} onChange={e => setNewNote(e.target.value)} />
              <Button size="sm" className="self-end shrink-0 h-9" onClick={() => handleAddNote(t.id)} disabled={!newNote.trim()}>Add Note</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Support Tickets</h2>
          <p className="text-sm text-muted-foreground mt-1">Track, manage, and resolve support requests.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 self-start"><Plus className="h-3.5 w-3.5" />New Ticket</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
              <DialogDescription>Log a new support issue to track and resolve.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label className="text-xs">Subject *</Label><Input className="mt-1" placeholder="Brief description of the issue" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
              <div><Label className="text-xs">Description</Label><Textarea className="mt-1" placeholder="Detailed description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as Ticket['priority'] }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Business</Label><Input className="mt-1" placeholder="Business name" value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create Ticket</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          { key: 'open', label: 'Open', icon: AlertCircle, color: 'text-red-600 bg-red-500/10' },
          { key: 'in_progress', label: 'In Progress', icon: Clock, color: 'text-amber-600 bg-amber-500/10' },
          { key: 'resolved', label: 'Resolved', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-500/10' },
          { key: 'closed', label: 'Closed', icon: XCircle, color: 'text-slate-600 bg-slate-500/10' },
        ] as const).map(item => (
          <Card key={item.key} className={cn('border-slate-200/70 shadow-sm cursor-pointer transition-all hover:shadow-md', statusFilter === item.key && 'ring-2 ring-primary/20')} onClick={() => setStatusFilter(prev => prev === item.key ? 'all' : item.key)}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{item.label}</p>
                  <p className="text-3xl font-bold tracking-tight mt-1">{stats[item.key]}</p>
                </div>
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', item.color)}>
                  <item.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by subject, business, or ID..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets Table */}
      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Tickets
            <Badge variant="outline" className="text-xs ml-1">{filtered.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto opacity-10 mb-4" />
              <p className="font-semibold text-foreground">{tickets.length === 0 ? 'No tickets yet' : 'No matching tickets'}</p>
              <p className="text-sm mt-1">{tickets.length === 0 ? 'Create your first support ticket to get started.' : 'Try adjusting your filters.'}</p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>ID</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(t => {
                      const pConfig = PRIORITY_CONFIG[t.priority];
                      const sConfig = STATUS_CONFIG[t.status];
                      const PIcon = pConfig.icon;
                      const SIcon = sConfig.icon;
                      return (
                        <TableRow key={t.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedTicket(t)}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{t.id}</TableCell>
                          <TableCell>
                            <p className="font-semibold text-sm">{t.subject}</p>
                            {t.notes.length > 0 && <span className="text-[10px] text-muted-foreground">{t.notes.length} note{t.notes.length > 1 ? 's' : ''}</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{t.business_name}</TableCell>
                          <TableCell><Badge className={cn('text-[10px] gap-1', pConfig.color)}><PIcon className="h-3 w-3" />{pConfig.label}</Badge></TableCell>
                          <TableCell><Badge className={cn('text-[10px] gap-1', sConfig.color)}><SIcon className="h-3 w-3" />{sConfig.label}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(t.created_at), 'MMM dd, yyyy')}</TableCell>
                          <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile */}
              <div className="sm:hidden divide-y divide-border">
                {filtered.map(t => {
                  const pConfig = PRIORITY_CONFIG[t.priority];
                  const sConfig = STATUS_CONFIG[t.status];
                  return (
                    <div key={t.id} className="px-4 py-3 space-y-2 cursor-pointer hover:bg-muted/30" onClick={() => setSelectedTicket(t)}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{t.subject}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{t.id} · {t.business_name}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      </div>
                      <div className="flex gap-1.5">
                        <Badge className={cn('text-[10px]', pConfig.color)}>{pConfig.label}</Badge>
                        <Badge className={cn('text-[10px]', sConfig.color)}>{sConfig.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
